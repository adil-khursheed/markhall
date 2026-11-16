import type { QuestionSpec } from '@/lib/generate/plan'

export type MockSlot = {
  type: QuestionSpec['type']
  marks: number
  difficulty: QuestionSpec['difficulty']
  chapterId: number
}

/**
 * A board-style paper pattern: fixed marks per type, about 40% objective and
 * 60% written, difficulty spread 25% easy / 50% medium / 25% hard.
 */
const TYPE_PLAN = [
  { type: 'mcq', marks: 1, ratio: 0.4 },
  { type: 'numeric', marks: 2, ratio: 0.2 },
  { type: 'short', marks: 3, ratio: 0.2 },
  { type: 'long', marks: 5, ratio: 0.2 },
] as const

/**
 * Turn a question count and per-chapter shares into concrete slots. Chapter 0
 * means "any chapter of the subject".
 */
export function planPattern(count: number, chapterShares: Map<number, number>): MockSlot[] {
  const total = Math.max(1, count)
  const queue: number[] = []
  for (const [chapterId, items] of chapterShares) {
    for (let index = 0; index < items; index += 1) queue.push(chapterId)
  }

  const slots: MockSlot[] = []
  let assigned = 0
  for (const [index, entry] of TYPE_PLAN.entries()) {
    const isLast = index === TYPE_PLAN.length - 1
    const items = isLast ? total - assigned : Math.round(entry.ratio * total)
    assigned += items
    for (let slotIndex = 0; slotIndex < items; slotIndex += 1) {
      const position = slots.length
      slots.push({
        type: entry.type,
        marks: entry.marks,
        difficulty: position % 4 === 0 ? 'easy' : position % 4 === 3 ? 'hard' : 'medium',
        chapterId: queue.length ? queue[position % queue.length] : 0,
      })
    }
  }
  return slots
}

export type PoolQuestion = {
  id: number
  type: string
  marks: number
  difficulty: string
  chapter: number
}

/**
 * Fill each slot from the published pool without reuse. Marks and difficulty
 * are preferences, type and chapter are hard filters.
 */
export function pickForSlots(
  slots: MockSlot[],
  pool: PoolQuestion[],
): { assignments: ({ id: number; marks: number } | null)[]; missing: MockSlot[] } {
  const used = new Set<number>()
  const assignments: ({ id: number; marks: number } | null)[] = []
  const missing: MockSlot[] = []

  for (const slot of slots) {
    const candidates = pool.filter(
      (question) =>
        !used.has(question.id) &&
        question.type === slot.type &&
        (slot.chapterId === 0 || question.chapter === slot.chapterId),
    )
    const pick =
      candidates.find((q) => q.marks === slot.marks && q.difficulty === slot.difficulty) ??
      candidates.find((q) => q.marks === slot.marks) ??
      candidates.find((q) => q.difficulty === slot.difficulty) ??
      candidates[0]
    if (pick) {
      used.add(pick.id)
      assignments.push({ id: pick.id, marks: pick.marks })
    } else {
      assignments.push(null)
      missing.push(slot)
    }
  }

  return { assignments, missing }
}

/** Small deterministic PRNG so per-attempt shuffles are reproducible. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle driven by the seeded PRNG. */
export function shuffleSeeded<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed)
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}
