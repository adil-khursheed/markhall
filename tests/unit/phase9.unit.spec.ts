import { describe, expect, it } from 'vitest'

import {
  numericCheckScript,
  parseNumeric,
  scoreMcq,
  totalScore,
} from '@/lib/mock/grade'
import {
  pickForSlots,
  planPattern,
  shuffleSeeded,
  type MockSlot,
  type PoolQuestion,
} from '@/lib/mock/pattern'

describe('plan_pattern', () => {
  it('builds the full count with objective and written share', () => {
    const slots = planPattern(10, new Map([[1, 10]]))
    expect(slots).toHaveLength(10)
    const byType = new Map(slots.map((slot) => [slot.type, 0]))
    for (const slot of slots) byType.set(slot.type, (byType.get(slot.type) ?? 0) + 1)
    expect(byType.get('mcq')).toBe(4)
    expect(byType.get('numeric')).toBe(2)
    expect(byType.get('short')).toBe(2)
    expect(byType.get('long')).toBe(2)
  })

  it('cycles chapters when the shares cover the count and falls back to 0', () => {
    const covered = planPattern(4, new Map([[1, 3], [2, 3]]))
    expect(covered.every((slot) => slot.chapterId === 1 || slot.chapterId === 2)).toBe(true)
    const uncovered = planPattern(3, new Map())
    expect(uncovered.every((slot) => slot.chapterId === 0)).toBe(true)
  })
})

const POOL: PoolQuestion[] = [
  { id: 1, type: 'mcq', marks: 1, difficulty: 'easy', chapter: 1 },
  { id: 2, type: 'mcq', marks: 1, difficulty: 'hard', chapter: 1 },
  { id: 3, type: 'long', marks: 5, difficulty: 'medium', chapter: 2 },
  { id: 4, type: 'numeric', marks: 2, difficulty: 'easy', chapter: 2 },
]

describe('pick_for_slots', () => {
  it('fills matching slots without reuse and reports the missing ones', () => {
    const slots: MockSlot[] = [
      { type: 'mcq', marks: 1, difficulty: 'easy', chapterId: 1 },
      { type: 'mcq', marks: 1, difficulty: 'hard', chapterId: 1 },
      { type: 'mcq', marks: 1, difficulty: 'medium', chapterId: 1 },
      { type: 'long', marks: 5, difficulty: 'medium', chapterId: 2 },
    ]
    const { assignments, missing } = pickForSlots(slots, POOL)
    expect(assignments[0]).toEqual({ id: 1, marks: 1 })
    expect(assignments[1]).toEqual({ id: 2, marks: 1 })
    expect(assignments[2]).toBeNull()
    expect(assignments[3]).toEqual({ id: 3, marks: 5 })
    expect(missing).toHaveLength(1)
    expect(missing[0].type).toBe('mcq')
  })

  it('relaxes marks and difficulty before giving up', () => {
    const { assignments } = pickForSlots(
      [{ type: 'numeric', marks: 3, difficulty: 'hard', chapterId: 2 }] as MockSlot[],
      POOL,
    )
    expect(assignments[0]).toEqual({ id: 4, marks: 2 })
  })
})

describe('shuffle_seeded', () => {
  it('is deterministic for the same seed and a permutation of the input', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffleSeeded(items, 42)).toEqual(shuffleSeeded(items, 42))
    expect(shuffleSeeded(items, 42).sort((a, b) => a - b)).toEqual(items)
    expect(shuffleSeeded(items, 7)).not.toEqual(items)
  })
})

describe('parse_numeric', () => {
  it('reads plain, grouped and decorated numbers and rejects prose', () => {
    expect(parseNumeric('42')).toBe(42)
    expect(parseNumeric('1,25,000')).toBe(125000)
    expect(parseNumeric('The answer is -3.5 units')).toBe(-3.5)
    expect(parseNumeric('no number here')).toBeNull()
    expect(parseNumeric('')).toBeNull()
  })
})

const MCQ = {
  options: [
    { label: 'A', text: '3' },
    { label: 'B', text: '6' },
    { label: 'C', text: '9\\pi' },
    { label: 'D', text: '12' },
  ],
  finalAnswer: '9\\pi',
}

describe('score_mcq', () => {
  it('awards marks only for the computed correct option', () => {
    expect(scoreMcq({ question: MCQ, response: '9\\pi', marks: 3 })).toEqual({ score: 3, correct: true })
    expect(scoreMcq({ question: MCQ, response: '6', marks: 3, negativeMarking: 1 }).score).toBe(-1)
    expect(scoreMcq({ question: MCQ, response: 'made-up', marks: 3 }).score).toBe(0)
    expect(scoreMcq({ question: MCQ, response: '', marks: 3, negativeMarking: 1 }).score).toBe(0)
    expect(scoreMcq({ question: MCQ, marks: 3 }).score).toBe(0)
  })
})

describe('numeric_check_script', () => {
  it('checks the student number against the expected value with a tolerance', () => {
    const script = numericCheckScript({ student: 28.26, expected: 28.274 })
    expect(script).toContain('student = 28.26')
    expect(script).toContain('target = 28.274')
    expect(script).toContain('approx(student, target, 0.2827')
    expect(script).toContain('answer(ok=ok, diff=student - target)')
  })

  it('never uses a zero tolerance', () => {
    const script = numericCheckScript({ student: 5, expected: 0 })
    expect(script).toContain('approx(student, target, 1e-9')
  })
})

describe('total_score', () => {
  it('sums graded rows and treats pending as zero', () => {
    expect(totalScore([{ finalScore: 3 }, { finalScore: -1 }, { finalScore: null }, {}])).toBe(2)
  })
})
