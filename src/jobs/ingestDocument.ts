import type { WorkflowConfig } from 'payload'

import { classifyItems } from '@/lib/ingest/classify'
import { embedDocumentItems } from '@/lib/ingest/embed'
import { extractPages } from '@/lib/ingest/extract'
import { persistItems } from '@/lib/ingest/persist'
import { segmentDocument } from '@/lib/ingest/segment'
import { verifyNumerics } from '@/lib/ingest/verify'

export const ingestDocument: WorkflowConfig<'ingestDocument'> = {
  slug: 'ingestDocument',
  inputSchema: [{ name: 'documentId', type: 'number', required: true }],
  retries: 1,
  handler: async ({ job, inlineTask, req }) => {
    const documentId = job.input.documentId

    try {
      await req.payload.update({
        collection: 'source-documents',
        id: documentId,
        data: { ingestStatus: 'processing', ingestError: null },
        depth: 0,
        overrideAccess: true,
        req,
      })

      await inlineTask('extract', {
        retries: 2,
        task: async ({ req }) => ({ output: await extractPages(req.payload, documentId) }),
      })

      await inlineTask('segment', {
        retries: 2,
        task: async ({ req }) => ({ output: await segmentDocument(req.payload, documentId) }),
      })

      await inlineTask('classify', {
        retries: 3,
        task: async ({ req }) => ({ output: await classifyItems(req.payload, documentId) }),
      })

      await inlineTask('verify', {
        retries: 1,
        task: async () => ({ output: await verifyNumerics(documentId) }),
      })

      const persisted = await inlineTask('persist', {
        retries: 2,
        task: async ({ req }) => ({
          output: await persistItems(req.payload, documentId, req),
        }),
      })

      const embedded = await inlineTask('embed', {
        retries: 3,
        task: async ({ req }) => ({
          output: await embedDocumentItems(req.payload, documentId),
        }),
      })

      await inlineTask('finish', {
        task: async ({ req }) => {
          await req.payload.update({
            collection: 'source-documents',
            id: documentId,
            data: {
              ingestStatus: 'ready',
              ingestError: null,
              chunkCount: persisted.chunks,
              questionCount: persisted.questions,
              flaggedCount: persisted.flagged,
            },
            depth: 0,
            overrideAccess: true,
            req,
          })
          return { output: { ingestStatus: 'ready', ...persisted, ...embedded } }
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await req.payload.update({
        collection: 'source-documents',
        id: documentId,
        data: { ingestStatus: 'failed', ingestError: message.slice(0, 4000) },
        depth: 0,
        overrideAccess: true,
        req,
      })
      throw error
    }
  },
}
