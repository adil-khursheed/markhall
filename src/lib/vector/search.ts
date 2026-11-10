import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { KnowledgeBase, QuestionBank, User } from '@/payload-types'

export type SourceType = 'knowledge' | 'question'

export type VectorFilter = {
  sourceType: SourceType
  board: string
  classLevel: number
  subjectId?: number
  chapterId?: number
  language?: string
  difficulty?: string
  user?: User
}

type SourceDoc<T extends SourceType> = T extends 'question' ? QuestionBank : KnowledgeBase
export type VectorHit<T extends SourceType> = SourceDoc<T> & { score: number }

export async function vectorSearch<T extends SourceType>(
  payload: Payload,
  queryVec: number[],
  filter: VectorFilter & { sourceType: T },
  limit = 8,
): Promise<VectorHit<T>[]> {
  const vector = `[${queryVec.join(',')}]`

  const rows = await payload.db.drizzle.transaction(async (tx) => {
    // pgvector 0.8+: iterative scans keep filtered HNSW queries from returning too few rows.
    await tx.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`)
    await tx.execute(sql`SET LOCAL hnsw.ef_search = 100`)

    const result = await tx.execute(sql`
      SELECT source_id, 1 - (embedding <=> ${vector}::vector) AS score
      FROM content_embeddings
      WHERE source_type = ${filter.sourceType}
        AND board = ${filter.board}
        AND class_level = ${filter.classLevel}
        AND status = 'published'
        ${filter.subjectId ? sql`AND subject_id = ${filter.subjectId}` : sql``}
        ${filter.chapterId ? sql`AND chapter_id = ${filter.chapterId}` : sql``}
        ${filter.language ? sql`AND language = ${filter.language}` : sql``}
        ${filter.difficulty ? sql`AND difficulty = ${filter.difficulty}` : sql``}
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${limit}
    `)

    return result.rows as { source_id: number; score: number }[]
  })

  if (!rows.length) return []

  const collection = filter.sourceType === 'question' ? 'question-bank' : 'knowledge-base'
  const { docs } = await payload.find({
    collection,
    where: { id: { in: rows.map((row) => row.source_id) } },
    limit: rows.length,
    depth: 0,
    overrideAccess: !filter.user,
    user: filter.user,
  })

  const byId = new Map(docs.map((doc) => [doc.id, doc]))
  return rows.flatMap((row) => {
    const doc = byId.get(row.source_id)
    return doc ? [{ ...doc, score: Number(row.score) } as unknown as VectorHit<T>] : []
  })
}
