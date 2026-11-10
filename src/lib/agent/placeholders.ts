import type { ComputedValue } from './state'

const PLACEHOLDER = /<<v:([A-Za-z0-9_.-]+)>>/g

export function substituteValues(
  markdown: string,
  values: Record<string, ComputedValue>,
): { text: string; errors: string[] } {
  const errors: string[] = []
  const text = markdown.replace(PLACEHOLDER, (_, key: string) => {
    const value = values[key]
    if (!value) {
      errors.push(`Unknown computed value: ${key}`)
      return ''
    }
    return value.latex
  })

  if (text.includes('<<v:')) errors.push('Answer contains an unfinished value placeholder.')
  return { text, errors }
}

export function hasNumberedStep(markdown: string) {
  return /^\s*(?:\d+[.)](?=\s|$)|step\s+\d+\b)/im.test(markdown)
}

export function plainTextFallback(markdown: string) {
  return markdown
    .replace(/\$\$([\s\S]+?)\$\$/g, '$1')
    .replace(/\$([^$\n]+?)\$/g, '$1')
    .replace(PLACEHOLDER, '')
    .replace(/\s{3,}/g, ' ')
    .trim()
}
