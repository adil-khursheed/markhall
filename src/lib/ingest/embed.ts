import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { KnowledgeBase, QuestionBank } from '@/payload-types'
import { getEmbedder } from '@/lib/ai/models'
import { env } from '@/lib/env'
import { hashText } from './text'
import { relationId } from './utils'

type SourceType = 'knowledge' | 'question'

type EmbedRow = {
  sourceType: SourceType
  sourceId: number | string
  board: string
  classLevel: number
  subjectId: number | string
  chapterId: number | string | null
  language: string | null
  difficulty: string | null
  status: string | null
  contentHash: string
  text: string
}

function pool(payload: Payload) {
  return (payload.db as unknown as PostgresAdapter).pool
}

function chapterTitle(chapter: unknown) {
  if (chapter && typeof chapter === 'object' && 'title' in chapter) {
    return String((chapter as { title: string }).title)
  }
  return 'Unknown chapter'
}

export function knowledgeEmbeddingText(doc: {
  kind: string
  content: string
  chapter?: unknown
}) {
  return `Chapter: ${chapterTitle(doc.chapter)}. Topic: ${doc.kind}. ${doc.content}`
}

export function questionEmbeddingText(doc: {
  stem: string
  options?: { label: string; text: string }[] | null
  chapter?: unknown
}) {
  const options = (doc.options ?? [])
    .map((option) => `${option.label}: ${option.text}`)
    .join(' ')
  return `Chapter: ${chapterTitle(doc.chapter)}. ${doc.stem}${options ? ` Options: ${options}` : ''}`
}

function toKnowledgeRow(doc: KnowledgeBase): EmbedRow {
  return {
    sourceType: 'knowledge',
    sourceId: doc.id,
    board: doc.board,
    classLevel: doc.classLevel,
    subjectId: relationId(doc.subject),
    chapterId: doc.chapter ? relationId(doc.chapter) : null,
    language: doc.language ?? null,
    difficulty: null,
    status: null,
    contentHash: doc.contentHash ?? '',
    text: knowledgeEmbeddingText(doc),
  }
}

function toQuestionRow(doc: QuestionBank): EmbedRow {
  return {
    sourceType: 'question',
    sourceId: doc.id,
    board: doc.board,
    classLevel: doc.classLevel,
    subjectId: relationId(doc.subject),
    chapterId: doc.chapter ? relationId(doc.chapter) : null,
    language: doc.language ?? null,
    difficulty: doc.difficulty ?? null,
    status: doc.status ?? null,
    contentHash: doc.contentHash ?? '',
    text: questionEmbeddingText(doc),
  }
}

async function existingHashes(payload: Payload, sourceType: SourceType, ids: (number | string)[]) {
  if (!ids.length) return new Map<string, string>()
  const result = await pool(payload).query(
    'SELECT source_id, content_hash FROM content_embeddings WHERE source_type = $1 AND source_id = ANY($2::int[])',
    [sourceType, ids.map(Number)],
  )
  return new Map<string, string>(
    result.rows.map((row: { source_id: number; content_hash: string }) => [
      String(row.source_id),
      row.content_hash,
    ]),
  )
}

async function upsertRow(payload: Payload, row: EmbedRow, vector: number[]) {
  await pool(payload).query(
    `INSERT INTO content_embeddings
      (source_type, source_id, board, class_level, subject_id, chapter_id, language, difficulty, status, content_hash, embedding, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, now())
     ON CONFLICT (source_type, source_id) DO UPDATE SET
       board = EXCLUDED.board,
       class_level = EXCLUDED.class_level,
       subject_id = EXCLUDED.subject_id,
       chapter_id = EXCLUDED.chapter_id,
       language = EXCLUDED.language,
       difficulty = EXCLUDED.difficulty,
       status = EXCLUDED.status,
       content_hash = EXCLUDED.content_hash,
       embedding = EXCLUDED.embedding,
       updated_at = now()`,
    [
      row.sourceType,
      Number(row.sourceId),
      row.board,
      row.classLevel,
      Number(row.subjectId),
      row.chapterId === null ? null : Number(row.chapterId),
      row.language,
      row.difficulty,
      row.status,
      row.contentHash,
      JSON.stringify(vector),
    ],
  )
}

export async function embedRows(payload: Payload, rows: EmbedRow[]) {
  if (!rows.length) return { embedded: 0, skipped: 0 }

  const existing = new Map<SourceType, Map<string, string>>()
  for (const sourceType of ['knowledge', 'question'] as const) {
    const ids = rows.filter((row) => row.sourceType === sourceType).map((row) => row.sourceId)
    existing.set(sourceType, await existingHashes(payload, sourceType, ids))
  }

  const pending = rows.filter(
    (row) => existing.get(row.sourceType)?.get(String(row.sourceId)) !== row.contentHash,
  )
  const skipped = rows.length - pending.length

  let embedded = 0
  for (let start = 0; start < pending.length; start += 64) {
    const batch = pending.slice(start, start + 64)
    const vectors = await getEmbedder().embedDocuments(batch.map((row) => row.text))
    for (const [index, vector] of vectors.entries()) {
      if (vector.length !== env.embeddingDimension) {
        throw new Error(
          `Embedding dimension ${vector.length} does not match EMBEDDING_DIMENSION ${env.embeddingDimension}.`,
        )
      }
      await upsertRow(payload, batch[index], vector)
      embedded += 1
    }
  }

  return { embedded, skipped }
}

export async function embedDocumentItems(payload: Payload, documentId: number | string) {
  const { docs: knowledge } = await payload.find({
    collection: 'knowledge-base',
    where: { sourceDocument: { equals: documentId } },
    limit: 1000,
    depth: 2,
    overrideAccess: true,
  })

  const { docs: questions } = await payload.find({
    collection: 'question-bank',
    where: { sourceDocument: { equals: documentId } },
    limit: 1000,
    depth: 2,
    overrideAccess: true,
  })

  const rows: EmbedRow[] = [
    ...knowledge.map((doc) => toKnowledgeRow(doc)),
    ...questions.map((doc) => toQuestionRow(doc)),
  ]

  return embedRows(payload, rows)
}

export async function embedContent(
  payload: Payload,
  sourceType: SourceType,
  sourceId: number | string,
) {
  if (sourceType === 'knowledge') {
    const doc = await payload.findByID({
      collection: 'knowledge-base',
      id: sourceId,
      depth: 2,
      overrideAccess: true,
    })
    const text = knowledgeEmbeddingText(doc)
    if (!doc.contentHash) {
      doc.contentHash = hashText(text)
      await payload.update({
        collection: 'knowledge-base',
        id: doc.id,
        data: { contentHash: doc.contentHash },
        depth: 0,
        overrideAccess: true,
        context: { skipEmbedQueue: true },
      })
    }
    return embedRows(payload, [toKnowledgeRow(doc)])
  }

  const doc = await payload.findByID({
    collection: 'question-bank',
    id: sourceId,
    depth: 2,
    overrideAccess: true,
  })
  const text = questionEmbeddingText(doc)
  if (!doc.contentHash) {
    doc.contentHash = hashText(text)
    await payload.update({
      collection: 'question-bank',
      id: doc.id,
      data: { contentHash: doc.contentHash },
      depth: 0,
      overrideAccess: true,
      context: { skipEmbedQueue: true },
    })
  }
  return embedRows(payload, [toQuestionRow(doc)])
}

export async function removeEmbedding(
  payload: Payload,
  sourceType: SourceType,
  sourceId: number | string,
) {
  try {
    await pool(payload).query(
      'DELETE FROM content_embeddings WHERE source_type = $1 AND source_id = $2',
      [sourceType, Number(sourceId)],
    )
  } catch {
    // The vector table may not exist yet; deletion of the source row should still succeed.
  }
}
