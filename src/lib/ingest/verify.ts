import { z } from 'zod'

import { getModel } from '@/lib/ai/models'
import { env } from '@/lib/env'
import { readScratch, writeScratch } from './store'
import type { QuestionItem } from './types'

const scriptSchema = z.object({ script: z.string().min(1) })

type SandboxResult = {
  ok: boolean
  stdout: string
  stderr: string
  exitCode: number
}

function numericValue(text: string | undefined) {
  if (!text) return undefined
  const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i)
  if (!match) return undefined
  const value = Number(match[0])
  return Number.isFinite(value) ? value : undefined
}

export function numbersMatch(expected: number, actual: number) {
  const tolerance = Math.max(1e-9, Math.abs(expected) * 1e-6)
  return Math.abs(expected - actual) <= tolerance
}

function findNumeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  if (typeof record.num === 'number' && Number.isFinite(record.num)) return record.num
  for (const child of Object.values(record)) {
    const found = findNumeric(child)
    if (found !== undefined) return found
  }
  return undefined
}

function parseSandboxAnswer(stdout: string) {
  const lines = stdout
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown
      const value = findNumeric(parsed)
      if (value !== undefined) return value
    } catch {
      // Keep looking for the JSON line.
    }
  }
  return undefined
}

async function runSandbox(script: string): Promise<SandboxResult> {
  const response = await fetch(`${env.sandboxUrl.replace(/\/$/, '')}/runPython`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ script, timeout: env.sandboxTimeoutMs }),
    signal: AbortSignal.timeout(env.sandboxTimeoutMs + 1000),
  })

  if (!response.ok) throw new Error(`Sandbox returned HTTP ${response.status}`)
  return (await response.json()) as SandboxResult
}

async function verifyQuestion(question: QuestionItem) {
  const expected = numericValue(question.finalAnswer)
  if (question.type !== 'numeric' && expected === undefined) return

  if (expected === undefined) {
    question.verification = { status: 'skipped', detail: 'No numeric answer in the source.' }
    return
  }

  const { script } = await getModel('solver')
    .withStructuredOutput(scriptSchema)
    .invoke(
      `Write a short SymPy Python script that computes the answer to this question.
Print exactly one JSON object with the shape {"answer": {"latex": "...", "num": <number>}}.
Use float(...) or evalf() for the numeric value. Do not print anything else.

Question:
${question.stem}

Expected answer from the source: ${question.finalAnswer}`,
    )

  let result: SandboxResult
  try {
    result = await runSandbox(script)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    question.verification = { status: 'unavailable', detail: reason }
    return
  }

  if (!result.ok) {
    question.verification = {
      status: 'unavailable',
      detail: result.stderr || `Sandbox exited with code ${result.exitCode}`,
    }
    return
  }

  const actual = parseSandboxAnswer(result.stdout)
  if (actual === undefined) {
    question.verification = {
      status: 'unavailable',
      detail: 'Sandbox output did not contain a numeric value.',
    }
    return
  }

  if (numbersMatch(expected, actual)) {
    question.verification = { status: 'ok', detail: `Expected ${expected}, got ${actual}.` }
    return
  }

  const detail = `Verification mismatch: source says ${expected}, sandbox computed ${actual}.`
  question.verification = { status: 'mismatch', detail }
  question.status = 'in_review'
  question.reviewNotes = [question.reviewNotes, detail].filter(Boolean).join(' ')
}

export async function verifyNumerics(documentId: number | string) {
  const scratch = await readScratch(documentId)

  let checked = 0
  let mismatches = 0
  let unavailable = 0

  for (const question of scratch.questions) {
    const expected = numericValue(question.finalAnswer)
    if (question.type !== 'numeric' && expected === undefined) continue

    checked += 1
    try {
      await verifyQuestion(question)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      question.verification = { status: 'unavailable', detail: reason }
    }

    if (question.verification?.status === 'mismatch') mismatches += 1
    if (question.verification?.status === 'unavailable') unavailable += 1
  }

  await writeScratch(documentId, scratch)
  return { checked, mismatches, unavailable }
}
