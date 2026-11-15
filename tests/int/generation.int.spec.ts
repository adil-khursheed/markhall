// @vitest-environment node

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'
import { saveQuestionDraft, generateOne, type QuestionDraft } from '@/lib/generate/worker'
import type { QuestionSpec } from '@/lib/generate/plan'

const mock = vi.hoisted(() => ({
  draft: {
    stem: 'Solve $2x + 3 = 9$ and state the root.',
    options: [
      { label: 'A', text: '3' },
      { label: 'B', text: '6' },
      { label: 'C', text: '12' },
      { label: 'D', text: '9' },
    ],
    concept: 'linear equations',
    script: "x = symbols('x')\nanswer(final=3, unique=True, wrong1=6, wrong2=12, wrong3=9)",
    solution: '1. Subtract 3 from both sides.\n\n2. Divide by 2: the root is <<v:final>>.',
  } as QuestionDraft,
  sandbox: {
    ok: true,
    stdout: '{"final":{"latex":"3","num":3},"unique":{"latex":"1","num":1},"wrong1":{"latex":"6","num":6},"wrong2":{"latex":"12","num":12},"wrong3":{"latex":"9","num":9}}',
    stderr: '',
    exitCode: 0,
    values: {
      final: { latex: '3', num: 3 },
      unique: { latex: '1', num: 1 },
      wrong1: { latex: '6', num: 6 },
      wrong2: { latex: '12', num: 12 },
      wrong3: { latex: '9', num: 9 },
    },
  },
  similarity: 0.1 as number,
  solveAttempts: 0,
}))

vi.mock('@/lib/ai/models', () => ({
  getModel: () => ({
    withStructuredOutput: () => ({
      invoke: async () => {
        mock.solveAttempts += 1
        return mock.draft
      },
    }),
    invoke: async () => ({ content: 'unused' }),
  }),
  getEmbedder: () => ({
    embedDocuments: async () => [[1, 0, 0]],
  }),
}))

vi.mock('@/lib/vector/search', () => ({
  vectorSearch: async () =>
    mock.similarity >= 0.92 ? [{ id: 999, score: mock.similarity, stem: 'existing' }] : [],
}))

vi.mock('@/lib/agent/sandbox', () => ({
  runPython: async () => mock.sandbox,
}))

let payload: Payload
let admin: User
let student: User
let subjectId: number
let chapterId: number

const createdQuestions: number[] = []

const SPEC: QuestionSpec = {
  type: 'mcq',
  marks: 3,
  difficulty: 'medium',
  chapterId: 0, // set in beforeAll
  concept: 'linear equations',
}

describe('Phase 8 question generation', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const stamp = Date.now()

    admin = await payload.create({
      collection: 'users',
      data: {
        email: `gen-admin-${stamp}@markhall.test`,
        password: 'test-password-123',
        name: 'Gen Admin',
        role: 'admin',
        board: 'cbse',
        classLevel: 10,
        preferredLanguage: 'en',
      },
    })
    student = await payload.create({
      collection: 'users',
      data: {
        email: `gen-student-${stamp}@markhall.test`,
        password: 'test-password-123',
        name: 'Gen Student',
        role: 'student',
        board: 'cbse',
        classLevel: 10,
        preferredLanguage: 'en',
      },
    })

    const subject = await payload.create({
      collection: 'subjects',
      data: {
        board: 'cbse',
        classLevel: 10,
        name: `Gen Maths ${stamp}`,
        code: `GN${stamp}`,
        academicYear: '2025-26',
      },
    })
    const chapter = await payload.create({
      collection: 'chapters',
      data: { subject: subject.id, number: 1, title: 'Linear equations' },
    })
    subjectId = subject.id
    chapterId = chapter.id
    SPEC.chapterId = chapter.id
  })

  beforeEach(() => {
    mock.solveAttempts = 0
    mock.similarity = 0.1
  })

  afterAll(async () => {
    for (const id of createdQuestions.reverse()) {
      await payload.delete({ collection: 'question-bank', id, overrideAccess: true }).catch(() => {})
    }
  })

  it('saveQuestionDraft stores a reviewable item with its verification', async () => {
    const doc = await saveQuestionDraft({
      payload,
      spec: SPEC,
      draft: mock.draft,
      subjectId,
      board: 'cbse',
      classLevel: 10,
      values: mock.sandbox.values as never,
      stdout: mock.sandbox.stdout,
    })
    createdQuestions.push(doc.id)

    expect(doc.origin).toBe('generated')
    expect(doc.status).toBe('in_review')
    expect(doc.finalAnswer).toBe('3')
    expect((doc.verification as { script?: string }).script).toContain('answer(final=3')

    // Students never see in_review items; admins do.
    await expect(
      payload.find({ collection: 'question-bank', where: { id: { equals: doc.id } }, user: student, overrideAccess: false }),
    ).resolves.toMatchObject({ totalDocs: 0 })
    await expect(
      payload.find({ collection: 'question-bank', where: { id: { equals: doc.id } }, user: admin, overrideAccess: false }),
    ).resolves.toMatchObject({ totalDocs: 1 })
  })

  it('generateOne saves after checks and retries on failure', async () => {
    const result = await generateOne({ payload, user: admin, spec: SPEC, subjectId })
    expect(result).toMatchObject({ ok: true })
    createdQuestions.push((result as { id: number }).id)
    expect(mock.solveAttempts).toBe(1)

    // A near-duplicate must be dropped after the full retry budget.
    mock.similarity = 0.95
    const duplicate = await generateOne({ payload, user: admin, spec: SPEC, subjectId })
    expect(duplicate).toMatchObject({ ok: false })
    expect((duplicate as { errors: string[] }).errors.join(' ')).toContain('Too similar')
    expect(mock.solveAttempts).toBe(4) // initial run plus two retries
  })

  it('publishing stamps the reviewer identity', async () => {
    const doc = await saveQuestionDraft({
      payload,
      spec: SPEC,
      draft: mock.draft,
      subjectId,
      board: 'cbse',
      classLevel: 10,
      values: mock.sandbox.values as never,
      stdout: mock.sandbox.stdout,
    })
    createdQuestions.push(doc.id)

    const updated = await payload.update({
      collection: 'question-bank',
      id: doc.id,
      data: { status: 'published' },
      user: admin,
      overrideAccess: false,
      depth: 0,
    })

    const stored = await payload.findByID({ collection: 'question-bank', id: doc.id, overrideAccess: true })
    expect(updated.status).toBe('published')
    expect(stored.reviewedBy).toBe(admin.id)
  })
})
