import katex from 'katex'

const MATH = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

export function normalizeMath(markdown: string) {
  return markdown
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr: string) => `$$${expr}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr: string) => `$${expr}$`)
}

export function validateLatex(markdown: string) {
  const errors: string[] = []

  for (const match of markdown.matchAll(MATH)) {
    const expr = match[1] ?? match[2]
    const displayMode = match[1] !== undefined
    try {
      katex.renderToString(expr, { throwOnError: true, displayMode, strict: 'ignore' })
    } catch (error) {
      errors.push(`Invalid LaTeX "${expr.trim()}": ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (markdown.replace(MATH, '').includes('$')) errors.push('Answer contains an unbalanced $ delimiter.')

  return { valid: errors.length === 0, errors }
}
