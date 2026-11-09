import { readFile, writeFile } from 'node:fs/promises'

import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'
import sharp from 'sharp'

const MB = 1024 * 1024

export const maxUploadSize =
  (bytes: number): CollectionBeforeValidateHook =>
  ({ data, req }) => {
    if (req.file && req.file.size > bytes) {
      throw new APIError(`File must be ${bytes / MB} MB or smaller.`, 400)
    }
    return data
  }

export const stripExif: CollectionBeforeValidateHook = async ({ data, req }) => {
  const file = req.file
  if (!file || !file.mimetype.startsWith('image/')) return data

  const input = file.tempFilePath ? await readFile(file.tempFilePath) : file.data
  const stripped = await sharp(input).rotate().toBuffer()

  file.data = stripped
  file.size = stripped.length
  if (file.tempFilePath) await writeFile(file.tempFilePath, stripped)

  return data
}
