import { normalizeMath, validateLatex } from './latex'
import { substituteValues } from './placeholders'
import type { ComputedValue } from './state'

const CUT = '\n\n'

/**
 * True while a math delimiter ($$ display or inline $, or un-normalised \(..\)
 * and \[..\] pairs from the raw model stream) is still open, so the assembler
 * must not cut a block on a blank line inside it.
 */
export function mathOpen(text: string): boolean {
  let rest = text.replace(/\$\$[\s\S]*?\$\$/g, '').replace(/\\\[[\s\S]*?\\\]/g, '').replace(/\\\([\s\S]*?\\\)/g, '')
  if ((rest.match(/(?<!\\)\$\$/g)?.length ?? 0) % 2 === 1) return true
  if (rest.includes('\\[') || rest.includes('\\(')) return true
  return ((rest.match(/(?<!\\)\$/g)?.length ?? 0) % 2 === 1)
}

export type BlockCheck = {
  /** Substituted, normalised text. */
  text: string
  errors: string[]
}

/**
 * Substitute sandbox placeholders, normalise \(..\)/\[..\] delimiters and
 * validate the KaTeX of one block. Unsubstituted placeholders never reach the
 * client: an unknown key is a validation error, not an empty slot.
 */
export function validateBlock(raw: string, values: Record<string, ComputedValue>): BlockCheck {
  const substituted = substituteValues(raw, values)
  const text = normalizeMath(substituted.text)
  return { text, errors: [...substituted.errors, ...validateLatex(text).errors] }
}

export function createBlockAssembler() {
  let buffer = ''

  function firstCut(text: string): number {
    let from = 0
    for (;;) {
      const at = text.indexOf(CUT, from)
      if (at < 0) return -1
      if (!mathOpen(text.slice(0, at))) return at
      from = at + 1
    }
  }

  return {
    /** Feed the next streamed chunk; returns every raw block completed by it. */
    feed(chunk: string): string[] {
      // Normalise before cutting: \(..\) and \[....\] can span blank lines, and
      // normalisation makes them visible to mathOpen as $$ pairs. Idempotent.
      buffer = normalizeMath(buffer + chunk)
      const out: string[] = []
      for (;;) {
        const at = firstCut(buffer)
        if (at < 0) break
        const raw = buffer.slice(0, at)
        buffer = buffer.slice(at + CUT.length)
        if (raw.trim()) out.push(raw)
      }
      return out
    },
    /** Flush the tail as a final raw block once the stream ends. */
    flush(): string[] {
      const raw = buffer
      buffer = ''
      return raw.trim() ? [raw] : []
    },
  }
}
