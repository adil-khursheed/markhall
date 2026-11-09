import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '@/lib/env'
import type { IngestScratch } from './types'

export function sourceDocumentsDir() {
  return path.resolve(process.cwd(), env.uploadsDir, 'source-documents')
}

export function sourcePdfPath(filename: string) {
  return path.join(sourceDocumentsDir(), filename)
}

function scratchPath(documentId: number | string) {
  return path.join(sourceDocumentsDir(), `.ingest-${documentId}.json`)
}

export async function writeScratch(documentId: number | string, data: IngestScratch) {
  await mkdir(sourceDocumentsDir(), { recursive: true })
  await writeFile(scratchPath(documentId), JSON.stringify(data), 'utf8')
}

export async function readScratch(documentId: number | string): Promise<IngestScratch> {
  const raw = await readFile(scratchPath(documentId), 'utf8')
  return JSON.parse(raw) as IngestScratch
}
