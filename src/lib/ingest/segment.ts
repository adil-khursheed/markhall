import type { Payload } from 'payload'
import { z } from 'zod'

import { getModel } from '@/lib/ai/models'
import { chunkText, estimateTokens, hashText, inferKnowledgeKind } from './text'
import { writeScratch } from './store'
import type { IngestScratch, KnowledgeItem, QuestionItem } from './types'

const questionSchema = z.object({
  questions: z.array(
    z.object({
      stem: z.string().min(1),
      type: z.enum(['mcq', 'short', 'long', 'numeric']),
      marks: z.number().int().min(1),
      options: z
        .array(z.object({ label: z.enum(['A', 'B', 'C', 'D']), text: z.string() }))
        .optional(),
      solution: z.string().optional(),
      finalAnswer: z.string().optional(),
      needsFigure: z.boolean().optional(),
    }),
  ),
})

function questionHash(question: {
  stem: string
  options?: { label: string; text: string }[]
  finalAnswer?: string
}) {
  return hashText(
    question.stem,
    ...(question.options ?? []).map((option) => `${option.label}: ${option.text}`),
    question.finalAnswer,
  )
}

function pageRangeLabel(pageNumbers: number[]) {
  if (!pageNumbers.length) return ''
  const first = pageNumbers[0]
  const last = pageNumbers[pageNumbers.length - 1]
  return first === last ? String(first) : `${first}-${last}`
}

function knowledgeFromPages(pages: { pageNumber: number; text: string }[]) {
  const knowledge: KnowledgeItem[] = []
  for (const page of pages) {
    for (const content of chunkText(page.text)) {
      knowledge.push({
        kind: inferKnowledgeKind(content),
        content,
        pageRange: String(page.pageNumber),
        contentHash: hashText(content),
      })
    }
  }
  return knowledge
}

async function questionsFromPages(
  pages: { pageNumber: number; text: string }[],
  metadata: { board: string; classLevel: number; subject: string; docType: string; year?: number },
) {
  const batches: { pages: number[]; text: string }[] = []
  let current = { pages: [] as number[], text: '' }

  for (const page of pages) {
    if (current.text && estimateTokens(current.text) + estimateTokens(page.text) > 6000) {
      batches.push(current)
      current = { pages: [], text: '' }
    }
    current.pages.push(page.pageNumber)
    current.text += `\n\n[Page ${page.pageNumber}]\n${page.text}`
  }
  if (current.text) batches.push(current)

  const questions: QuestionItem[] = []
  const seen = new Set<string>()

  for (const batch of batches) {
    const range = pageRangeLabel(batch.pages)
    const result = await getModel('router')
      .withStructuredOutput(questionSchema)
      .invoke(
        `Extract every question from this ${metadata.board} Class ${metadata.classLevel} ${metadata.subject} ${metadata.docType}${metadata.year ? ` (${metadata.year})` : ''} paper.
Keep the original numbering out of the stem. Use Markdown and LaTeX. Include options only for MCQs. Include the given solution or answer only when the paper prints one.
Pages in this batch: ${range}.

${batch.text}`,
      )

    for (const question of result.questions) {
      const item: QuestionItem = {
        stem: question.stem.trim(),
        type: question.type,
        marks: question.marks,
        options: question.type === 'mcq' ? question.options : undefined,
        solution: question.solution?.trim() || undefined,
        finalAnswer: question.finalAnswer?.trim() || undefined,
        needsFigure: question.needsFigure,
        pageRange: range,
        contentHash: questionHash(question),
      }
      if (!seen.has(item.contentHash)) {
        seen.add(item.contentHash)
        questions.push(item)
      }
    }
  }

  return questions
}

export async function segmentDocument(payload: Payload, documentId: number | string) {
  const doc = await payload.findByID({
    collection: 'source-documents',
    id: documentId,
    depth: 1,
    overrideAccess: true,
  })

  const { docs: pages } = await payload.find({
    collection: 'source-pages',
    where: { document: { equals: documentId } },
    sort: 'pageNumber',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  if (!pages.length) throw new Error('No extracted pages to segment.')

  const subject = typeof doc.subject === 'object' ? doc.subject.name : String(doc.subject)
  const scratch: IngestScratch =
    doc.docType === 'syllabus'
      ? { knowledge: knowledgeFromPages(pages), questions: [] }
      : {
          knowledge: [],
          questions: await questionsFromPages(pages, {
            board: doc.board,
            classLevel: doc.classLevel,
            subject,
            docType: doc.docType,
            year: doc.year ?? undefined,
          }),
        }

  await writeScratch(documentId, scratch)

  return {
    chunks: scratch.knowledge.length,
    questions: scratch.questions.length,
  }
}
