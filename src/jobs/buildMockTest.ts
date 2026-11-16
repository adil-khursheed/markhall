import type { TaskConfig } from 'payload'

import type { User } from '@/payload-types'
import { distributeCount, weakChapterWeights } from '@/lib/generate/plan'
import { generateOne } from '@/lib/generate/worker'
import { planPattern, pickForSlots, type PoolQuestion } from '@/lib/mock/pattern'

const BATCH = 4 // the sandbox runs 2 workers with an 8-slot queue

/**
 * buildMockTest: plan a paper from the blueprint, fill every slot with a
 * published bank item first, generate the missing slots before the test
 * starts, and publish only when every question is published (the review gate
 * hook enforces it again on save).
 */
export const buildMockTest: TaskConfig<'buildMockTest'> = {
  slug: 'buildMockTest',
  inputSchema: [
    { name: 'subjectId', type: 'number', required: true },
    { name: 'userId', type: 'number' },
    { name: 'count', type: 'number', required: true },
    { name: 'durationMinutes', type: 'number', required: true },
    { name: 'negativeMarking', type: 'number' },
    { name: 'title', type: 'text' },
  ],
  retries: 0, // a retry would duplicate the generated questions
  handler: async ({ input, req }) => {
    const payload = req.payload

    const subject = await payload.findByID({
      collection: 'subjects',
      id: input.subjectId,
      depth: 0,
      overrideAccess: true,
    })
    const chapters = await payload.find({
      collection: 'chapters',
      where: { subject: { equals: input.subjectId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    })
    if (!chapters.docs.length) throw new Error('That subject has no chapters to build a test from.')

    // Weak chapters carry more slots. Personal tests weight the student's own
    // mastery; shared tests weight every student's rows.
    const chapterIds = chapters.docs.map((chapter) => chapter.id)
    const mastery = await payload.find({
      collection: 'topic-mastery',
      where: {
        and: [
          { chapter: { in: chapterIds } },
          ...(input.userId ? [{ user: { equals: input.userId } }] : []),
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    const weights = weakChapterWeights(mastery.docs)
    for (const chapter of chapters.docs) if (!weights.has(chapter.id)) weights.set(chapter.id, 1)
    const shares = distributeCount(weights, input.count)
    const slots = planPattern(input.count, shares)

    // Personal tests skip questions the student has already answered.
    const excluded = new Set<number>()
    if (input.userId) {
      const practice = await payload.find({
        collection: 'attempts',
        where: { user: { equals: input.userId } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      const mocks = await payload.find({
        collection: 'mock-attempts',
        where: { user: { equals: input.userId } },
        limit: 200,
        depth: 0,
        overrideAccess: true,
      })
      for (const row of practice.docs) excluded.add(Number(row.question))
      for (const row of mocks.docs) {
        for (const answer of row.answers ?? []) excluded.add(Number(answer.question))
      }
    }

    const poolRows = await payload.find({
      collection: 'question-bank',
      where: {
        and: [
          { subject: { equals: input.subjectId } },
          { status: { equals: 'published' } },
          { needsFigure: { not_equals: true } },
        ],
      },
      limit: 300,
      depth: 0,
      overrideAccess: true,
    })
    const pool: PoolQuestion[] = poolRows.docs
      .filter((doc) => !excluded.has(Number(doc.id)))
      .map((doc) => ({
        id: Number(doc.id),
        type: doc.type,
        marks: doc.marks,
        difficulty: doc.difficulty,
        chapter: Number(doc.chapter),
      }))

    const { assignments, missing } = pickForSlots(slots, pool)

    // Generate the missing slots before the clock can start on this paper.
    const generated: number[] = []
    const failures: string[] = []
    const systemUser = { id: 0, role: 'admin' } as unknown as User // only read for the sandbox user key
    const pending = missing.map((slot) => ({
      spec: {
        ...slot,
        concept: chapters.docs.find((chapter) => chapter.id === slot.chapterId)?.title ?? 'general',
      },
    }))
    for (let start = 0; start < pending.length; start += BATCH) {
      const results = await Promise.all(
        pending.slice(start, start + BATCH).map(async ({ spec }) => ({
          spec,
          result: await generateOne({ payload, user: systemUser, spec, subjectId: input.subjectId }),
        })),
      )
      for (const { spec, result } of results) {
        if (result.ok) generated.push(result.id)
        else failures.push(`${spec.type} on "${spec.concept}": ${result.errors.join('; ')}`)
      }
    }

    const questionIds = [
      ...assignments.flatMap((picked) => (picked ? [picked.id] : [])),
      ...generated,
    ]
    if (!questionIds.length) throw new Error('No questions could be assembled or generated.')

    const totalMarks =
      assignments.reduce((sum, picked) => sum + (picked?.marks ?? 0), 0) +
      pending.reduce((sum, { spec }) => sum + spec.marks, 0)
    const status = missing.length === 0 ? 'published' : 'in_review'

    const doc = await payload.create({
      collection: 'mock-tests',
      data: {
        title: input.title ?? `${subject.name} mock paper`,
        board: subject.board,
        classLevel: subject.classLevel,
        subject: input.subjectId,
        durationMinutes: input.durationMinutes,
        totalMarks,
        negativeMarking: input.negativeMarking ?? 0,
        sections: [{ name: 'Paper', questions: questionIds }],
        ...(input.userId ? { generatedFor: input.userId } : {}),
        blueprintSnapshot: {
          slots,
          shares: [...shares.entries()],
          reused: assignments.flatMap((picked) => (picked ? [picked.id] : [])),
          generated,
          failures,
          builtAt: new Date().toISOString(),
        },
        status,
      },
      depth: 0,
      overrideAccess: true,
    })

    return {
      output: {
        testId: doc.id,
        status,
        totalMarks,
        reused: questionIds.length - generated.length,
        generated: generated.length,
        missing: missing.length,
        failures,
      },
    }
  },
}
