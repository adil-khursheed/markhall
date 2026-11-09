import type { Payload, PayloadRequest } from 'payload'

export async function queueIngest(
  payload: Payload,
  documentId: number | string,
  req?: PayloadRequest,
) {
  await payload.jobs.queue({
    workflow: 'ingestDocument',
    input: { documentId: Number(documentId) },
    req,
  })
}

export async function queueEmbed(
  payload: Payload,
  sourceType: 'knowledge' | 'question',
  sourceId: number | string,
  req?: PayloadRequest,
) {
  await payload.jobs.queue({
    task: 'embedContent',
    input: { sourceType, sourceId: Number(sourceId) },
    req,
  })
}
