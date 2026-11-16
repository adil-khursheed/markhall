import type { Payload, Where } from 'payload'

import type { User } from '@/payload-types'

/**
 * Each answer moves mastery 20% toward the latest result, so one lucky or
 * unlucky answer cannot swing a chapter to 0 or 1. A brand-new chapter starts
 * from a neutral 0.5.
 */
export function computeMastery(input: {
  previous?: number | null
  wasCorrect: boolean
}): number {
  const previous = typeof input.previous === 'number' ? input.previous : 0.5
  const latest = input.wasCorrect ? 1 : 0
  return Math.round((0.8 * previous + 0.2 * latest) * 100) / 100
}

/** Upsert the student's topic-mastery row for one answered question. */
export async function recordMastery(
  payload: Payload,
  userId: number | string,
  chapterId: number | string,
  wasCorrect: boolean,
): Promise<void> {
  const { docs } = await payload.find({
    collection: 'topic-mastery',
    where: { and: [{ user: { equals: userId } }, { chapter: { equals: chapterId } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const existing = docs[0]
  const mastery = computeMastery({ previous: existing?.mastery, wasCorrect })

  if (existing) {
    await payload.update({
      collection: 'topic-mastery',
      id: existing.id,
      data: {
        attempts: (existing.attempts ?? 0) + 1,
        correct: (existing.correct ?? 0) + (wasCorrect ? 1 : 0),
        mastery,
        lastSeenAt: new Date().toISOString(),
      },
      depth: 0,
      overrideAccess: true,
    })
    return
  }

  await payload.create({
    collection: 'topic-mastery',
    data: {
      user: userId as number,
      chapter: chapterId as number,
      attempts: 1,
      correct: wasCorrect ? 1 : 0,
      mastery,
      lastSeenAt: new Date().toISOString(),
    },
    depth: 0,
    overrideAccess: true,
  })
}

/**
 * Syllabus coverage for a student: chapters with a mastery row over all
 * chapters of their board/class subjects. Used by the dashboard and the
 * tutor header.
 */
export async function coveragePercent(payload: Payload, user: User): Promise<number | undefined> {
  const subjectWhere: Where = {}
  if (user.board) subjectWhere.board = { equals: user.board }
  if (user.classLevel != null) subjectWhere.classLevel = { equals: user.classLevel }

  const subjects = await payload
    .find({
      collection: 'subjects',
      where: Object.keys(subjectWhere).length ? subjectWhere : undefined,
      limit: 50,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  const subjectIds = (subjects?.docs ?? []).map((subject) => subject.id)
  if (!subjectIds.length) return undefined

  const chapters = (await payload
    .find({
      collection: 'chapters',
      where: { subject: { in: subjectIds } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)) ?? { docs: [] }
  const total = chapters.docs.length
  if (!total) return undefined

  const mastery = await payload
    .find({
      collection: 'topic-mastery',
      where: { and: [{ user: { equals: user.id } }, { chapter: { in: chapters.docs.map((chapter) => chapter.id) } }] },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)

  return Math.round(((mastery?.docs.length ?? 0) / total) * 100)
}
