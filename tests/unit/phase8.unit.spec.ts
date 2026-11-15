import { describe, expect, it } from 'vitest'

import { checkQuestion, cosine, type QuestionDraft } from '@/lib/generate/worker'
import { distributeCount, weakChapterWeights } from '@/lib/generate/plan'
import type { QuestionSpec } from '@/lib/generate/plan'

const SPEC: QuestionSpec = {
  type: 'mcq',
  marks: 3,
  difficulty: 'medium',
  chapterId: 1,
  concept: 'linear equations',
}

const DRAFT: QuestionDraft = {
  stem: 'Solve $2x + 3 = 9$.',
  options: [
    { label: 'A', text: '3' },
    { label: 'B', text: '6' },
    { label: 'C', text: '12' },
    { label: 'D', text: '9' },
  ],
  concept: 'linear equations',
  script: 'answer(final=3, unique=True, wrong1=6, wrong2=12, wrong3=9)',
  solution: '1. Subtract 3.\n\n2. Divide by 2.',
}

const VALUES = {
  final: { latex: '3', num: 3 },
  unique: { latex: '1', num: 1 },
  wrong1: { latex: '6', num: 6 },
  wrong2: { latex: '12', num: 12 },
  wrong3: { latex: '9', num: 9 },
}

function check(overrides: {
  spec?: Partial<QuestionSpec>
  draft?: Partial<QuestionDraft>
  values?: Record<string, { latex: string; num?: number | null }> | null
  chunks?: string[]
  similarity?: number
  type?: string
  marks?: number
  difficulty?: string
}) {
  return checkQuestion({
    spec: { ...SPEC, ...(overrides.spec ?? {}) },
    draft: { ...DRAFT, ...(overrides.draft ?? {}) },
    type: overrides.type ?? SPEC.type,
    marks: overrides.marks ?? SPEC.marks,
    difficulty: overrides.difficulty ?? SPEC.difficulty,
    values: ('values' in overrides ? overrides.values : VALUES) as never,
    chunks: overrides.chunks ?? ['A linear equations chapter with solving steps.'],
    similarity: overrides.similarity ?? 0.1,
  })
}

describe('check_question', () => {
  it('passes a complete verified item', () => {
    expect(check({})).toEqual({ ok: true, errors: [] })
  })

  it('rejects a missing or non-unique computed answer', () => {
    expect(check({ values: null }).errors.join(' ')).toContain('No computed answer')
    expect(check({ values: { ...VALUES, unique: { latex: '0', num: 0 } } }).errors.join(' ')).toContain(
      'not unique',
    )
  })

  it('rejects specs that do not match the plan', () => {
    const errors = check({
      type: 'numeric',
      marks: 5,
      difficulty: 'easy',
    }).errors
    expect(errors).toHaveLength(3)
  })

  it('requires exactly one correct MCQ option and computed distractors', () => {
    const twoCorrect = check({
      draft: {
        options: [
          { label: 'A', text: '3' },
          { label: 'B', text: '3' },
          { label: 'C', text: '6' },
          { label: 'D', text: '12' },
        ],
      },
    })
    expect(twoCorrect.errors.join(' ')).toContain('exactly one correct option')

    const noDistractors = check({ values: { final: VALUES.final, unique: VALUES.unique } })
    expect(noDistractors.errors.filter((error) => error.includes('distractor'))).toHaveLength(3)

    const wrongCount = check({ draft: { options: DRAFT.options!.slice(0, 3) } })
    expect(wrongCount.errors.join(' ')).toContain('exactly 4 options')
  })

  it('rejects a concept the syllabus never mentions', () => {
    expect(check({ chunks: ['Geometry only.'] }).errors.join(' ')).toContain('linear equations')
  })

  it('rejects near-duplicates of existing bank items', () => {
    expect(check({ similarity: 0.92 }).errors.join(' ')).toContain('Too similar')
    expect(check({ similarity: 0.9199 }).ok).toBe(true)
  })
})

describe('cosine', () => {
  it('returns 1 for identical and 0 for orthogonal vectors', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(cosine([], [])).toBe(0)
  })
})

describe('weak-chapter planning', () => {
  it('weights weak chapters above mastered ones', () => {
    const weights = weakChapterWeights([
      { chapter: 1, mastery: 0.9 },
      { chapter: 1, mastery: 0.8 },
      { chapter: 2, mastery: 0.1 },
    ])
    expect(weights.get(2)).toBeGreaterThan(weights.get(1)!)
  })

  it('distributes the count across chapters by weight', () => {
    const plan = distributeCount(
      new Map([
        [1, 3],
        [2, 1],
      ]),
      8,
    )
    const total = [...plan.values()].reduce((sum, value) => sum + value, 0)
    expect(total).toBeGreaterThanOrEqual(8)
    expect(plan.get(1)!).toBeGreaterThan(plan.get(2)!)
  })
})
