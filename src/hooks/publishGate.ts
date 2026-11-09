import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

type Section = {
  questions?: (number | string | { id: number | string })[]
}

export const requirePublishedQuestions: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (data.status !== 'published') return data

  const ids = new Set<number | string>()
  for (const section of (data.sections ?? []) as Section[]) {
    for (const question of section.questions ?? []) {
      ids.add(typeof question === 'object' ? question.id : question)
    }
  }

  if (ids.size === 0) {
    throw new APIError('A published mock test needs at least one question.', 400)
  }

  const { totalDocs } = await req.payload.count({
    collection: 'question-bank',
    overrideAccess: true,
    where: {
      id: { in: [...ids] },
      status: { equals: 'published' },
    },
  })

  if (totalDocs !== ids.size) {
    throw new APIError('Every question in a mock test must be published first.', 400)
  }

  return data
}
