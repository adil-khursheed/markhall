// @vitest-environment node

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { extractPages } from '@/lib/ingest/extract'
import { persistItems } from '@/lib/ingest/persist'
import { writeScratch } from '@/lib/ingest/store'
import { chunkText, estimateTokens, hashText } from '@/lib/ingest/text'
import { numbersMatch } from '@/lib/ingest/verify'

function escapePdfText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function makePdf(lines: string[]) {
  const content = `BT /F1 12 Tf 72 720 Td ${lines
    .map((line, index) => `${index === 0 ? '' : '0 -18 Td '}(${escapePdfText(line)}) Tj`)
    .join(' ')} ET`

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }

  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`

  return Buffer.from(pdf, 'latin1')
}

let payload: Payload
let subjectId: number | string
let chapterId: number | string
let documentId: number | string

describe('Phase 2 ingestion', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    // PDF.js rejects arrays when a test runner adds enumerable helpers to Array.prototype.
    delete (Array.prototype as unknown as Record<string, unknown>).random
    const stamp = Date.now()

    const subject = await payload.create({
      collection: 'subjects',
      data: { board: 'cbse', classLevel: 10, name: `Ingest ${stamp}`, code: `ING${stamp}`, academicYear: '2025-26' },
    })
    const chapter = await payload.create({
      collection: 'chapters',
      data: { subject: subject.id, number: 1, title: 'Quadratic equations' },
    })

    subjectId = subject.id
    chapterId = chapter.id

    const pdf = makePdf(['1. What is 2 + 2?', 'Answer: 4'])
    const doc = await payload.create({
      collection: 'source-documents',
      data: {
        title: `Fixture ${stamp}`,
        docType: 'pyq',
        board: 'cbse',
        classLevel: 10,
        subject: subject.id,
        year: 2024,
        language: 'en',
      },
      file: {
        data: pdf,
        mimetype: 'application/pdf',
        name: `fixture-${stamp}.pdf`,
        size: pdf.length,
      },
    })
    documentId = doc.id
  })

  afterAll(async () => {
    if (!payload) return

    const cleanup = async (collection: string, id?: number | string) => {
      if (id === undefined) return
      try {
        await payload.delete({ collection: collection as never, id, overrideAccess: true })
      } catch {
        // Already gone.
      }
    }

    await payload.delete({
      collection: 'source-pages',
      where: { document: { equals: Number(documentId) } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'knowledge-base',
      where: { sourceDocument: { equals: Number(documentId) } },
      overrideAccess: true,
    })
    await cleanup('source-documents', documentId)
    await cleanup('chapters', chapterId)
    await cleanup('subjects', subjectId)
  })

  it('extracts text from a fixture PDF into source-pages', async () => {
    const result = await extractPages(payload, documentId)
    expect(result.pages).toBe(1)

    const { docs } = await payload.find({
      collection: 'source-pages',
      where: { document: { equals: Number(documentId) } },
      overrideAccess: true,
    })

    expect(docs).toHaveLength(1)
    expect(docs[0].text).toContain('2 + 2')
  })

  it('re-extracts without duplicating pages', async () => {
    await extractPages(payload, documentId)
    await extractPages(payload, documentId)

    const { totalDocs } = await payload.count({
      collection: 'source-pages',
      where: { document: { equals: Number(documentId) } },
      overrideAccess: true,
    })

    expect(totalDocs).toBe(1)
  })

  it('upserts persisted rows by contentHash', async () => {
    const content = 'A quadratic equation has the form ax^2 + bx + c = 0.'
    await writeScratch(documentId, {
      knowledge: [
        {
          kind: 'concept',
          content,
          pageRange: '1',
          contentHash: hashText(content),
          chapterId,
        },
      ],
      questions: [],
    })

    await persistItems(payload, documentId)
    await persistItems(payload, documentId)

    const { totalDocs } = await payload.count({
      collection: 'knowledge-base',
      where: { sourceDocument: { equals: Number(documentId) } },
      overrideAccess: true,
    })

    expect(totalDocs).toBe(1)
  })

  it('keeps syllabus chunks within the token budget', () => {
    const text = Array.from({ length: 80 }, (_, index) => `Paragraph ${index} with some words.`).join(
      '\n\n',
    )
    const chunks = chunkText(text)

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(estimateTokens(chunk)).toBeLessThanOrEqual(500)
  })

  it('compares numeric answers with a tolerance', () => {
    expect(numbersMatch(4, 4.0000001)).toBe(true)
    expect(numbersMatch(4, 4.1)).toBe(false)
  })
})
