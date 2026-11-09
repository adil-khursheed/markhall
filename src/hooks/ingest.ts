import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { removeEmbedding } from '@/lib/ingest/embed'
import { queueEmbed, queueIngest } from '@/lib/ingest/queue'

export const queueDocumentIngest: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'create' || context?.skipIngestQueue) return doc

  await req.payload.update({
    collection: 'source-documents',
    id: doc.id,
    data: { ingestStatus: 'pending', ingestError: null },
    depth: 0,
    overrideAccess: true,
    context: { skipIngestQueue: true },
    req,
  })
  await queueIngest(req.payload, doc.id, req)

  return doc
}

export const queueKnowledgeEmbed: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipEmbedQueue) return doc
  await queueEmbed(req.payload, 'knowledge', doc.id, req)
  return doc
}

export const queueQuestionEmbed: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipEmbedQueue) return doc
  await queueEmbed(req.payload, 'question', doc.id, req)
  return doc
}

export const removeKnowledgeEmbed: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeEmbedding(req.payload, 'knowledge', doc.id)
  return doc
}

export const removeQuestionEmbed: CollectionAfterDeleteHook = async ({ doc, req }) => {
  await removeEmbedding(req.payload, 'question', doc.id)
  return doc
}
