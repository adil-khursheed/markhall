import type { Payload } from 'payload'
import { z } from 'zod'

import { getModel } from '@/lib/ai/models'
import { readScratch, writeScratch } from './store'
import type { KnowledgeItem, QuestionItem } from './types'

const knowledgeSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      chapterId: z.coerce.string(),
      kind: z.enum(['concept', 'formula', 'example', 'definition']),
    }),
  ),
})

const questionSchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int().min(0),
      chapterId: z.coerce.string(),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      needsFigure: z.boolean(),
    }),
  ),
})

const BATCH_SIZE = 15

function chapterListText(chapters: { id: number | string; title: string }[]) {
  return chapters.map((chapter) => `- id: ${chapter.id}, title: ${chapter.title}`).join('\n')
}

function resolveChapter(
  chapterId: string,
  text: string,
  chapters: { id: number | string; title: string }[],
) {
  const exact = chapters.find((chapter) => String(chapter.id) === String(chapterId))
  if (exact) return { chapter: exact, valid: true }

  const lower = text.toLowerCase()
  const byTitle = chapters.find((chapter) => lower.includes(chapter.title.toLowerCase()))
  return { chapter: byTitle ?? chapters[0], valid: false }
}

async function classifyKnowledge(
  items: KnowledgeItem[],
  chapters: { id: number | string; title: string }[],
) {
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE)
    const pending = batch.map((item, index) => ({ item, index }))
    let remaining = pending

    for (let attempt = 0; attempt < 2 && remaining.length; attempt += 1) {
      const result = await getModel('router')
        .withStructuredOutput(knowledgeSchema)
        .invoke(
          `Pick exactly one chapter id from the closed list for each syllabus chunk. Never invent a chapter id.
Return one entry per index.

Closed chapters:
${chapterListText(chapters)}

${remaining
  .map(
    ({ item, index }) =>
      `Index ${index}:\n${item.content.slice(0, 1500)}`,
  )
  .join('\n\n')}`,
        )

      const byIndex = new Map(result.items.map((item) => [item.index, item]))
      const stillInvalid: typeof pending = []

      for (const entry of remaining) {
        const match = byIndex.get(entry.index)
        const resolved = match
          ? resolveChapter(String(match.chapterId), entry.item.content, chapters)
          : { chapter: chapters[0], valid: false }

        entry.item.chapterId = resolved.chapter.id
        if (match) entry.item.kind = match.kind
        if (!resolved.valid) stillInvalid.push(entry)
      }

      remaining = stillInvalid
    }

    for (const { item } of remaining) item.chapterId = chapters[0].id
  }
}

async function classifyQuestions(
  items: QuestionItem[],
  chapters: { id: number | string; title: string }[],
) {
  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE)
    let remaining = batch.map((item, index) => ({ item, index }))

    for (let attempt = 0; attempt < 2 && remaining.length; attempt += 1) {
      const result = await getModel('router')
        .withStructuredOutput(questionSchema)
        .invoke(
          `Classify each question. Pick exactly one chapter id from the closed list. Never invent a chapter id.
Estimate difficulty and whether the question needs a figure.

Closed chapters:
${chapterListText(chapters)}

${remaining
  .map(({ item, index }) => `Index ${index}:\n${item.stem}`)
  .join('\n\n')}`,
        )

      const byIndex = new Map(result.items.map((item) => [item.index, item]))
      const stillInvalid: typeof remaining = []

      for (const entry of remaining) {
        const match = byIndex.get(entry.index)
        const resolved = match
          ? resolveChapter(String(match.chapterId), entry.item.stem, chapters)
          : { chapter: chapters[0], valid: false }

        entry.item.chapterId = resolved.chapter.id
        if (match) {
          entry.item.difficulty = match.difficulty
          entry.item.needsFigure = match.needsFigure
        }
        if (!resolved.valid) stillInvalid.push(entry)
      }

      remaining = stillInvalid
    }

    for (const { item } of remaining) {
      item.chapterId = chapters[0].id
      item.status = 'in_review'
      item.reviewNotes = 'Could not classify into a chapter; assigned the first chapter.'
    }
  }
}

export async function classifyItems(payload: Payload, documentId: number | string) {
  const doc = await payload.findByID({
    collection: 'source-documents',
    id: documentId,
    depth: 0,
    overrideAccess: true,
  })

  const { docs: chapters } = await payload.find({
    collection: 'chapters',
    where: { subject: { equals: doc.subject } },
    sort: 'number',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  if (!chapters.length) {
    throw new Error(
      'No chapters exist for this subject. Create the chapter list before ingesting a document.',
    )
  }

  const scratch = await readScratch(documentId)
  await classifyKnowledge(scratch.knowledge, chapters)
  await classifyQuestions(scratch.questions, chapters)
  await writeScratch(documentId, scratch)

  return {
    chunks: scratch.knowledge.length,
    questions: scratch.questions.length,
  }
}
