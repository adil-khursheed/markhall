import { z } from 'zod'

import type { ComputedValue } from './state'

/**
 * compare_work: verify a handwritten solution by checking each consecutive
 * pair of steps for equivalence in SymPy. The model turns each step into one
 * SymPy assignment; the sandbox reports the first step that breaks the chain.
 */
export const compareStepsSchema = z.object({
  steps: z.array(z.string().min(1)).min(2).describe('One SymPy assignment per step, in order.'),
})

export type CompareResult = {
  ok: boolean
  /** 1-based index of the first step that disagrees with the previous one; -1 when all agree. */
  firstBadStep: number
  error?: string
}

export function buildCompareScript(steps: string[]): string {
  const assignments = steps
    .map((step, index) => `s${index + 1} = ${step}`)
    .join('\n')
  const checks = steps
    .slice(1)
    .map((_, index) => `if bad < 0 and not equiv(s${index + 1}, s${index + 2}): bad = ${index + 2}`)
    .join('\n')
  return `${assignments}\nbad = -1\n${checks}\nanswer(first_bad=bad)`
}

export function parseCompare(values: Record<string, ComputedValue> | undefined): CompareResult {
  const raw = values?.first_bad?.num
  const firstBadStep = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : -1
  return { ok: true, firstBadStep: Number.isInteger(firstBadStep) ? firstBadStep : -1 }
}

export function compareNote(result: CompareResult | undefined): string {
  if (!result || !result.ok) return ''
  if (result.firstBadStep < 0) {
    return 'Every consecutive pair of the student\'s steps checks out as equivalent.'
  }
  return `The student's step ${result.firstBadStep} is the FIRST step that does not follow from the previous one. Do not re-solve the whole problem: start the teaching at step ${result.firstBadStep}, show why it is wrong, and rebuild from there.`
}
