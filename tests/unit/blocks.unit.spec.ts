import { describe, expect, it } from 'vitest'

import { createBlockAssembler, mathOpen, validateBlock } from '@/lib/agent/blocks'
import { doneContent, replayEvents, type TutorEvent } from '@/lib/agent/turn'

const VALUES = {
  root1: { latex: '\\frac{1}{2}', num: 0.5 },
  area: { latex: '49\\pi', num: 153.94 },
}

function feed(text: string, chunkSize = 3) {
  const assembler = createBlockAssembler()
  const blocks: string[] = []
  for (let at = 0; at < text.length; at += chunkSize) {
    blocks.push(...assembler.feed(text.slice(at, at + chunkSize)))
  }
  blocks.push(...assembler.flush())
  return blocks
}

describe('createBlockAssembler', () => {
  it('cuts on blank lines and flushes the tail', () => {
    const blocks = feed('Step 1.\n\nStep 2.\n\nStep 3.')
    expect(blocks).toEqual(['Step 1.', 'Step 2.', 'Step 3.'])
  })

  it('does not cut while display math is open across a blank line', () => {
    const text = 'Step 1.\n\n$$\nx = 1\n\ny = 2\n$$\n\nStep 2.'
    const blocks = feed(text)
    expect(blocks).toEqual(['Step 1.', '$$\nx = 1\n\ny = 2\n$$', 'Step 2.'])
  })

  it('does not cut while inline math is open', () => {
    const text = 'The value $x\n\nis 2$ here.\n\nDone.'
    const blocks = feed(text)
    expect(blocks).toEqual(['The value $x\n\nis 2$ here.', 'Done.'])
  })

  it('protects \\(..\\) and \\[..\\] spanning a blank line by normalising first', () => {
    const text = 'Step 1.\n\n\\[\na^2 + b^2\n\nc^2\n\\]\n\nStep 2.'
    const blocks = feed(text)
    expect(blocks).toEqual(['Step 1.', '$$\na^2 + b^2\n\nc^2\n$$', 'Step 2.'])
  })

  it('ignores escaped dollar signs when deciding to cut', () => {
    const blocks = feed('The price is \\$5.\n\nStep 2.')
    expect(blocks).toEqual(['The price is \\$5.', 'Step 2.'])
  })

  it('emits blocks as they complete across tiny chunks', () => {
    const assembler = createBlockAssembler()
    const first = assembler.feed('One.\n\nTw')
    expect(first).toEqual(['One.'])
    const rest = [...assembler.feed('o.'), ...assembler.flush()]
    expect(rest).toEqual(['Two.'])
  })
})

describe('mathOpen', () => {
  it('detects open display math, closed pairs, and plain text', () => {
    expect(mathOpen('$$\nx = 1')).toBe(true)
    expect(mathOpen('$$x$$')).toBe(false)
    expect(mathOpen('costs $5 and $6')).toBe(false)
    expect(mathOpen('costs $5')).toBe(true)
    expect(mathOpen('\\[a\n\nb')).toBe(true)
    expect(mathOpen('\\[a\\]')).toBe(false)
    expect(mathOpen('\\(a\\)')).toBe(false)
  })
})

describe('validateBlock', () => {
  it('substitutes placeholders and normalises math delimiters', () => {
    const check = validateBlock('The root is <<v:root1>> and \\(x + 1\\).', VALUES)
    expect(check.errors).toEqual([])
    expect(check.text).toBe('The root is \\frac{1}{2} and $x + 1$.')
  })

  it('normalises display brackets', () => {
    const check = validateBlock('\\[x^2\\]', VALUES)
    expect(check.text).toBe('$$x^2$$')
  })

  it('rejects unknown placeholders instead of sending them', () => {
    const check = validateBlock('Value <<v:ghost>> here.', VALUES)
    expect(check.errors.some((error) => error.includes('ghost'))).toBe(true)
  })

  it('flags unbalanced math delimiters', () => {
    const check = validateBlock('Broken $\\frac{1}{2 math.', VALUES)
    expect(check.errors.length).toBeGreaterThan(0)
  })
})

describe('reconnection', () => {
  const history: TutorEvent[] = [
    { type: 'status', label: 'Reading your doubt' },
    { type: 'block', index: 0, text: 'Step 1.' },
    { type: 'block', index: 1, text: 'Step 2.' },
    { type: 'done', threadId: 7, content: 'Step 1.\n\nStep 2.', mode: 'doubt', flagged: false },
  ]

  it('replays only unseen blocks, never stale statuses', () => {
    const events = replayEvents(history, 1)
    expect(events).toEqual([
      { type: 'block', index: 1, text: 'Step 2.' },
      { type: 'done', threadId: 7, content: 'Step 1.\n\nStep 2.', mode: 'doubt', flagged: false },
    ])
  })

  it('replays everything for a client that saw nothing', () => {
    const events = replayEvents(history, 0)
    expect(events.some((event) => event.type === 'done')).toBe(true)
    expect(events.some((event) => event.type === 'status')).toBe(false)
  })
})

describe('final-message equality', () => {
  it('the validated whole answer equals the joined validated blocks', () => {
    const text =
      'Step 1: note that \\(a^2\\) applies.\n\n$$\\frac{49\\pi}{1}$$\n\nStep 2: the area is <<v:area>>.'
    const blocks = feed(text)
    const joined = blocks.map((block) => validateBlock(block, VALUES).text).join('\n\n')
    expect(joined).toBe(validateBlock(text, VALUES).text)
  })

  it('the checkpointed draft wins over the streamed preview', () => {
    const draft = 'Step 1.\n\nStep 2 (repaired).'
    expect(doneContent({ draft, mode: 'doubt' }, ['preview'])).toBe(draft)
    expect(doneContent(undefined, ['preview', 'blocks'])).toBe('preview\n\nblocks')
    expect(doneContent(undefined, [])).toBeUndefined()
  })
})
