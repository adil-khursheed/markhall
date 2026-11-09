import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { CollectionBeforeChangeHook, CollectionBeforeValidateHook, Where } from 'payload'
import { APIError } from 'payload'

export const sourceDocumentHash: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data) return data

  const file = req.file
  if (!file) return data

  const input = file.tempFilePath ? await readFile(file.tempFilePath) : file.data
  data.fileHash = createHash('sha256').update(input).digest('hex')

  return data
}

export const rejectDuplicateSourceDocument: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data.fileHash) return data

  const and: Where[] = [{ fileHash: { equals: data.fileHash } }]
  if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })

  const { totalDocs } = await req.payload.count({
    collection: 'source-documents',
    overrideAccess: true,
    where: { and },
  })

  if (totalDocs > 0) {
    throw new APIError('This PDF has already been uploaded.', 409)
  }

  return data
}
