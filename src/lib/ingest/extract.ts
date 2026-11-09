import { readFile } from 'node:fs/promises'

import { HumanMessage } from '@langchain/core/messages'
import type { Payload } from 'payload'
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'

import { getModel } from '@/lib/ai/models'
import { sourcePdfPath } from './store'

const MIN_PAGE_CHARS = 40

function needsVision(text: string) {
  // shortcut: catches empty or garbled text layers, not every broken math layout; add layout checks when real PDFs need it.
  const compact = text.replace(/\s/g, '')
  if (compact.length < MIN_PAGE_CHARS) return true
  const garbage = (compact.match(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/g) ?? []).length
  return garbage / compact.length > 0.02
}

function replyText(content: unknown) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => (typeof part === 'string' ? part : part && 'text' in part ? String(part.text) : ''))
    .join('')
}

async function transcribePage(pdf: Awaited<ReturnType<typeof getDocumentProxy>>, pageNumber: number) {
  const dataUrl = await renderPageAsImage(pdf, pageNumber, {
    canvasImport: () => import('@napi-rs/canvas'),
    scale: 2,
    toDataURL: true,
  })

  const message = new HumanMessage({
    content: [
      {
        type: 'text',
        text: 'Transcribe this exam page to Markdown. Keep every number, symbol and formula. Write all mathematics as LaTeX. Return only the transcription.',
      },
      {
        type: 'image_url',
        image_url: { url: dataUrl },
      },
    ],
  })

  const reply = await getModel('vision').invoke([message])
  return replyText(reply.content).trim()
}

async function upsertPage(
  payload: Payload,
  documentId: number | string,
  pageNumber: number,
  text: string,
) {
  const { docs } = await payload.find({
    collection: 'source-pages',
    where: {
      and: [{ document: { equals: Number(documentId) } }, { pageNumber: { equals: pageNumber } }],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  const data = { document: Number(documentId), pageNumber, text }
  if (docs[0]) {
    await payload.update({
      collection: 'source-pages',
      id: docs[0].id,
      data,
      depth: 0,
      overrideAccess: true,
    })
  } else {
    await payload.create({
      collection: 'source-pages',
      data,
      depth: 0,
      overrideAccess: true,
    })
  }
}

export async function extractPages(payload: Payload, documentId: number | string) {
  const doc = await payload.findByID({
    collection: 'source-documents',
    id: documentId,
    depth: 0,
    overrideAccess: true,
  })

  if (!doc.filename) throw new Error(`Source document ${documentId} has no uploaded file.`)

  const bytes = await readFile(sourcePdfPath(doc.filename))
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { maxImageSize: 16_777_216 })
  const { text } = await extractText(pdf, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]

  let visionPages = 0
  let emptyPages = 0

  for (const [index, rawText] of pages.entries()) {
    const pageNumber = index + 1
    let pageText = rawText.trim()

    if (needsVision(pageText)) {
      emptyPages += 1
      try {
        pageText = await transcribePage(pdf, pageNumber)
        visionPages += 1
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        pageText = pageText || `[Page ${pageNumber} could not be read: ${reason}]`
      }
    }

    await upsertPage(payload, documentId, pageNumber, pageText || `[Page ${pageNumber} is empty]`)
  }

  await payload.delete({
    collection: 'source-pages',
    where: {
      and: [{ document: { equals: Number(documentId) } }, { pageNumber: { greater_than: pages.length } }],
    },
    overrideAccess: true,
  })

  return { pages: pages.length, visionPages, emptyPages }
}
