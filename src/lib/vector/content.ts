import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { getEmbedder } from '@/lib/ai/models'
import { env } from '@/lib/env'
import { vectorSearch, type SourceType } from './search'

export type ContentQuery = {
  sourceType: SourceType
  query: string
  subjectId?: number
  chapterId?: number
  difficulty?: string
  limit?: number
}

export async function searchContent(payload: Payload, user: User, query: ContentQuery) {
  if (!user.board || !user.classLevel) {
    throw new Error('Set board and classLevel on the profile before searching content.')
  }

  const vector = await getEmbedder().embedQuery(query.query)
  if (vector.length !== env.embeddingDimension) {
    throw new Error(
      `Embedding dimension ${vector.length} does not match EMBEDDING_DIMENSION ${env.embeddingDimension}.`,
    )
  }

  return vectorSearch(
    payload,
    vector,
    {
      sourceType: query.sourceType,
      board: user.board,
      classLevel: user.classLevel,
      subjectId: query.subjectId,
      chapterId: query.chapterId,
      language: user.preferredLanguage ?? undefined,
      difficulty: query.difficulty,
      user,
    },
    query.limit,
  )
}
