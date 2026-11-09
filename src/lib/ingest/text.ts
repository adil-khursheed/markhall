import { createHash } from 'node:crypto'

export function normalizeText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

export function hashText(...parts: (string | undefined | null)[]) {
  return createHash('sha256')
    .update(normalizeText(parts.filter(Boolean).join('\n')))
    .digest('hex')
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

function splitLongParagraph(paragraph: string, maxTokens: number) {
  const maxChars = maxTokens * 4
  const pieces: string[] = []
  let rest = paragraph

  while (rest.length > maxChars) {
    let cut = rest.lastIndexOf(' ', maxChars)
    if (cut < maxChars / 2) cut = maxChars
    pieces.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trimStart()
  }

  if (rest) pieces.push(rest)
  return pieces
}

export function chunkText(text: string, minTokens = 200, maxTokens = 500) {
  const paragraphs = normalizeText(text)
    .split(/\n\s*\n/)
    .flatMap((paragraph) => {
      const trimmed = paragraph.trim()
      if (!trimmed) return []
      return estimateTokens(trimmed) > maxTokens
        ? splitLongParagraph(trimmed, maxTokens)
        : [trimmed]
    })

  const chunks: string[] = []
  let current: string[] = []
  let currentTokens = 0

  const flush = () => {
    if (!current.length) return
    chunks.push(current.join('\n\n'))
    current = []
    currentTokens = 0
  }

  for (const paragraph of paragraphs) {
    const tokens = estimateTokens(paragraph)
    if (currentTokens >= minTokens && currentTokens + tokens > maxTokens) flush()
    current.push(paragraph)
    currentTokens += tokens
    if (currentTokens >= maxTokens) flush()
  }

  flush()
  return chunks
}

export function inferKnowledgeKind(text: string): 'concept' | 'formula' | 'example' | 'definition' {
  const head = text.slice(0, 120)
  if (/^example\b/i.test(head)) return 'example'
  if (/^definition\b/i.test(head)) return 'definition'
  if (/\bformula\b/i.test(head)) return 'formula'
  return 'concept'
}
