/** Confidence below this sends a written grade for human review. */
export const GRADE_CONFIDENCE = 0.7

/** Milliseconds until the server deadline; negative once it has passed. */
export function timeLeftMs(deadline?: string | null): number {
  if (!deadline) return 0
  return new Date(deadline).getTime() - Date.now()
}

const DEVANAGARI_DIGITS: Record<string, string> = Object.fromEntries(
  '०१२३४५६७८९'.split('').map((digit, index) => [digit, String(index)]),
)

/** Devanagari digits to ASCII so Indian-script answers parse. */
export function normaliseDigits(text: string): string {
  return text.replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] ?? digit)
}

/** First readable number (Indian or western digits, commas ignored). */
export function parseNumeric(text: string): number | null {
  const match = normaliseDigits(String(text).replace(/,/g, '')).match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

export type ScoredQuestion = {
  options?: { label?: string; text?: string }[] | null
  finalAnswer?: string | null
}

/**
 * MCQ scoring by code: the response must be one of the printed options and
 * equal the computed answer. Blanks never lose negative marks.
 */
export function scoreMcq(input: {
  question: ScoredQuestion
  response?: string | null
  marks: number
  negativeMarking?: number
}): { score: number; correct: boolean } {
  const response = (input.response ?? '').trim()
  if (!response) return { score: 0, correct: false }
  const optionTexts = (input.question.options ?? []).map((option) => (option.text ?? '').trim())
  const onPaper = optionTexts.includes(response)
  const correct = onPaper && response === (input.question.finalAnswer ?? '').trim()
  if (correct) return { score: input.marks, correct: true }
  const negative = input.negativeMarking ?? 0
  return { score: negative ? -Math.abs(negative) : 0, correct: false }
}

/**
 * Sandbox script that checks a student number against the computed answer
 * with a stated tolerance (1% relative, never below 1e-9).
 */
export function numericCheckScript(input: {
  student: number
  expected: number
  tolerance?: number
}): string {
  const tolerance = input.tolerance ?? Math.max(1e-9, Math.abs(input.expected) * 0.01)
  return [
    `student = ${input.student}`,
    `target = ${input.expected}`,
    `ok = 1 if approx(student, target, ${tolerance}) else 0`,
    'answer(ok=ok, diff=student - target)',
  ].join('\n')
}

/** Same tolerance rule, checked locally for practice answers. */
export function numericClose(student: number, expected: number): boolean {
  const tolerance = Math.max(1e-9, Math.abs(expected) * 0.01)
  return Math.abs(student - expected) <= tolerance
}

export function totalScore(rows: { finalScore?: number | null }[]): number {
  return rows.reduce((sum, row) => sum + (row.finalScore ?? 0), 0)
}
