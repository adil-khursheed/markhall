import { describe, expect, it } from 'vitest'

import { computeMastery } from '@/lib/mastery'
import { normaliseDigits, numericClose, parseNumeric } from '@/lib/mock/grade'
import { looksLikeLegacyHindi } from '@/lib/ingest/hindi'

describe('compute_mastery', () => {
  it('moves 20% toward the latest answer from a neutral start', () => {
    expect(computeMastery({ wasCorrect: true })).toBe(0.6)
    expect(computeMastery({ wasCorrect: false })).toBe(0.4)
  })

  it('climbs slowly with a run of correct answers and drops with wrong ones', () => {
    let mastery = 0.5
    for (let index = 0; index < 5; index += 1) mastery = computeMastery({ previous: mastery, wasCorrect: true })
    expect(mastery).toBeGreaterThan(0.8)
    expect(mastery).toBeLessThan(1)
    const dropped = computeMastery({ previous: mastery, wasCorrect: false })
    expect(dropped).toBeLessThan(mastery)
    expect(dropped).toBeGreaterThan(0)
  })

  it('rounds to two decimals', () => {
    expect(computeMastery({ previous: 0.63, wasCorrect: false })).toBe(0.5)
  })
})

describe('normalise_digits and parse_numeric', () => {
  it('reads Devanagari digits', () => {
    expect(normaliseDigits('२३.५')).toBe('23.5')
    expect(parseNumeric('उत्तर २३')).toBe(23)
  })

  it('keeps western and grouped numbers working', () => {
    expect(parseNumeric('1,25,000')).toBe(125000)
    expect(parseNumeric('-3.5')).toBe(-3.5)
  })
})

describe('numeric_close', () => {
  it('uses a 1 percent relative tolerance with a tiny floor', () => {
    expect(numericClose(28.26, 28.274)).toBe(true)
    expect(numericClose(28.26, 30)).toBe(false)
    expect(numericClose(0.0000000005, 0)).toBe(true)
    expect(numericClose(0.000001, 0)).toBe(false)
  })
})

describe('legacy hindi detection', () => {
  it('routes short Devanagari-free pages of a Hindi document to vision', () => {
    const kruti = 'es ukpk dk ;kn djsA tc ge ls xdYi gksrh gS rks ge mls Bksjh nr gSA'
    expect(looksLikeLegacyHindi(kruti)).toBe(true)
  })

  it('keeps real Devanagari text on the text path', () => {
    const real = 'यह एक प्रश्न है। समीकरण को हल कीजिए और उत्तर लिखिए। ' + 'हिन्दी '.repeat(10)
    expect(looksLikeLegacyHindi(real)).toBe(false)
  })

  it('ignores the rule for English documents', () => {
    expect(looksLikeLegacyHindi('plain ascii page', 'en')).toBe(false)
  })
})
