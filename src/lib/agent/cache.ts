import { createHash } from 'node:crypto'

import type { Payload } from 'payload'

/**
 * Verified doubt answers are cached by a normalised question, the requested
 * chapter and the language, so a repeat question skips the whole graph run.
 */
export function questionKey(input: {
  text: string
  subjectId?: number
  chapterId?: number
  language?: string
}): string {
  const normalised = input.text.toLowerCase().replace(/\s+/g, ' ').trim()
  return createHash('sha1')
    .update(
      [input.subjectId ?? '', input.chapterId ?? '', input.language ?? '', normalised].join('|'),
    )
    .digest('hex')
}

export async function findCachedAnswer(payload: Payload, key: string): Promise<string | null> {
  const rows = await payload
    .find({
      collection: 'verified-answers',
      where: { hash: { equals: key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  return rows?.docs[0]?.answer ?? null
}

export async function saveCachedAnswer(
  payload: Payload,
  input: { key: string; chapterId?: number; language?: string; question: string; answer: string },
): Promise<void> {
  const rows = await payload
    .find({
      collection: 'verified-answers',
      where: { hash: { equals: input.key } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  const data = {
    hash: input.key,
    ...(input.chapterId != null ? { chapter: input.chapterId } : {}),
    ...(input.language ? { language: input.language } : {}),
    question: input.question,
    answer: input.answer,
  }
  if (rows?.docs[0]) {
    await payload.update({
      collection: 'verified-answers',
      id: rows.docs[0].id,
      data,
      depth: 0,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'verified-answers',
      data,
      depth: 0,
      overrideAccess: true,
    })
  }
}
