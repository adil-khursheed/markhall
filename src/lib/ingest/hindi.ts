const DEVANAGARI = /[\u0900-\u097F]/g

/** Share of Devanagari characters among non-space characters, 0 to 1. */
export function devanagariShare(text: string): number {
  const letters = text.replace(/\s/g, '')
  if (!letters.length) return 0
  return (letters.match(DEVANAGARI) ?? []).length / letters.length

}

/**
 * Legacy Hindi fonts (Kruti Dev and friends) render Devanagari as ASCII
 * garbage, so a Hindi page with almost no Devanagari characters must go to
 * the vision path instead of producing garbage chunks.
 */
export function looksLikeLegacyHindi(text: string, language: string = 'hi'): boolean {
  if (language !== 'hi') return false
  return devanagariShare(text) < 0.05
}
