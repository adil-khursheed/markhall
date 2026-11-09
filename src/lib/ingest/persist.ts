import type { Payload, PayloadRequest } from 'payload'

import { readScratch } from './store'
import { relationId } from './utils'

function originFor(docType: string) {
  if (docType === 'pyq') return 'board_pyq' as const
  if (docType === 'textbook') return 'textbook' as const
  return 'generated' as const
}

async function findExisting(payload: Payload, collection: 'knowledge-base' | 'question-bank', hash: string) {
  const { docs } = await payload.find({
    collection,
    where: { contentHash: { equals: hash } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return docs[0]
}

export async function persistItems(
  payload: Payload,
  documentId: number | string,
  req?: PayloadRequest,
) {
  const doc = await payload.findByID({
    collection: 'source-documents',
    id: documentId,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const scratch = await readScratch(documentId)
  const base = {
    board: doc.board,
    classLevel: doc.classLevel,
    subject: Number(relationId(doc.subject)),
    language: doc.language ?? 'en',
  }
  const context = { skipEmbedQueue: true }

  for (const item of scratch.knowledge) {
    const data = {
      ...base,
      kind: item.kind,
      chapter: Number(item.chapterId),
      content: item.content,
      pageRange: item.pageRange,
      contentHash: item.contentHash,
      sourceDocument: Number(documentId),
    }
    const existing = await findExisting(payload, 'knowledge-base', item.contentHash)
    if (existing) {
      await payload.update({
        collection: 'knowledge-base',
        id: existing.id,
        data,
        depth: 0,
        overrideAccess: true,
        context,
        req,
      })
    } else {
      await payload.create({
        collection: 'knowledge-base',
        data,
        depth: 0,
        overrideAccess: true,
        context,
        req,
      })
    }
  }

  const origin = originFor(doc.docType)
  for (const item of scratch.questions) {
    const data = {
      ...base,
      stem: item.stem,
      type: item.type,
      options: item.type === 'mcq' ? item.options : [],
      marks: item.marks,
      difficulty: item.difficulty ?? ('medium' as const),
      chapter: Number(item.chapterId),
      contentHash: item.contentHash,
      canonicalSolution: item.solution,
      finalAnswer: item.finalAnswer,
      verification: item.verification,
      origin,
      pyqYear: origin === 'board_pyq' ? (doc.year ?? undefined) : undefined,
      sourceDocument: Number(documentId),
      needsFigure: item.needsFigure ?? false,
      reviewNotes: item.reviewNotes,
    }
    const existing = await findExisting(payload, 'question-bank', item.contentHash)
    if (existing) {
      await payload.update({
        collection: 'question-bank',
        id: existing.id,
        data: item.status === 'in_review' ? { ...data, status: 'in_review' } : data,
        depth: 0,
        overrideAccess: true,
        context,
        req,
      })
    } else {
      await payload.create({
        collection: 'question-bank',
        data: { ...data, status: item.status ?? 'draft' },
        depth: 0,
        overrideAccess: true,
        context,
        req,
      })
    }
  }

  const knowledgeHashes = scratch.knowledge.map((item) => item.contentHash)
  const questionHashes = scratch.questions.map((item) => item.contentHash)

  const deleteStale = async (
    collection: 'knowledge-base' | 'question-bank',
    hashes: string[],
  ) => {
    await payload.delete({
      collection,
      where: {
        and: [
          { sourceDocument: { equals: Number(documentId) } },
          ...(hashes.length ? [{ contentHash: { not_in: hashes } }] : []),
        ],
      },
      overrideAccess: true,
      context,
      req,
    })
  }

  await deleteStale('knowledge-base', knowledgeHashes)
  await deleteStale('question-bank', questionHashes)

  const flagged = scratch.questions.filter((item) => item.status === 'in_review').length

  return {
    chunks: scratch.knowledge.length,
    questions: scratch.questions.length,
    flagged,
  }
}
