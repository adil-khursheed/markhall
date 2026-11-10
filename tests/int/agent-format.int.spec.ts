// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { normalizeMath, validateLatex } from '@/lib/agent/latex'
import { hasNumberedStep, plainTextFallback, substituteValues } from '@/lib/agent/placeholders'

const values = {
  area: { latex: '154', num: 154 },
  root: { latex: '\\sqrt{2}', num: 1.414 },
}

describe('computed value placeholders', () => {
  it('substitutes every known key', () => {
    const result = substituteValues('The area is $<<v:area>>$ and the root is $<<v:root>>$.', values)
    expect(result.errors).toEqual([])
    expect(result.text).toBe('The area is $154$ and the root is $\\sqrt{2}$.')
  })

  it('rejects unknown and unfinished placeholders', () => {
    const unknown = substituteValues('Answer <<v:missing>>', values)
    expect(unknown.errors).toContain('Unknown computed value: missing')

    const unfinished = substituteValues('Answer <<v:area', values)
    expect(unfinished.errors).toContain('Answer contains an unfinished value placeholder.')
  })

  it('detects numbered steps', () => {
    expect(hasNumberedStep('1. Add the terms.')).toBe(true)
    expect(hasNumberedStep('Step 2: divide both sides.')).toBe(true)
    expect(hasNumberedStep('Add the terms.')).toBe(false)
  })

  it('builds a plain-text fallback', () => {
    expect(plainTextFallback('1. Value is $<<v:area>>$.\n\n2. Done.')).toBe('1. Value is .\n\n2. Done.')
  })
})

describe('LaTeX validation', () => {
  it('accepts inline and display math', () => {
    expect(validateLatex('So $x^2$ and $$\\frac{1}{2}$$').valid).toBe(true)
  })

  it('rejects broken math', () => {
    const result = validateLatex('So $\\frac{1}{$')
    expect(result.valid).toBe(false)
  })

  it('rejects an unbalanced delimiter', () => {
    const result = validateLatex('The value is $5')
    expect(result.errors).toContain('Answer contains an unbalanced $ delimiter.')
  })

  it('normalises bracket and paren delimiters', () => {
    expect(normalizeMath('a \\(x\\) b \\[y\\]')).toBe('a $x$ b $$y$$')
  })
})
