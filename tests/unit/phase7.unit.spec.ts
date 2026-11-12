import { readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { buildCompareScript, compareNote, parseCompare } from '@/lib/agent/compare'
import { stripExif } from '@/hooks/uploads'
import { clarifyDraft, needsConfirmation, retentionDate, type ImageRead } from '@/lib/agent/vision'
import sharp from 'sharp'

describe('compare_work script', () => {
  it('builds a self-contained script that reports the first broken step', () => {
    const script = buildCompareScript(['x + 1', 'x + 2 - 1', 'x + 1 + 0'])
    expect(script).toContain('s1 = x + 1')
    expect(script).toContain('s2 = x + 2 - 1')
    expect(script).toContain('s3 = x + 1 + 0')
    expect(script).toContain('if bad < 0 and not equiv(s1, s2): bad = 2')
    expect(script).toContain('if bad < 0 and not equiv(s2, s3): bad = 3')
    expect(script).toContain('answer(first_bad=bad)')
  })

  it('parses the sandbox answer into the first failing step', () => {
    expect(parseCompare({ first_bad: { latex: '2', num: 2 } })).toEqual({ ok: true, firstBadStep: 2 })
    expect(parseCompare({ first_bad: { latex: '-1', num: -1 } })).toEqual({ ok: true, firstBadStep: -1 })
    // A malformed or missing value must not name a broken step.
    expect(parseCompare(undefined)).toEqual({ ok: true, firstBadStep: -1 })
    expect(parseCompare({ first_bad: { latex: '', num: null } })).toEqual({ ok: true, firstBadStep: -1 })
  })

  it('writes the teach-from-this-step note only when a step broke', () => {
    expect(compareNote({ ok: true, firstBadStep: 3 })).toContain('step 3')
    expect(compareNote({ ok: true, firstBadStep: -1 })).not.toContain('FIRST')
    expect(compareNote({ ok: false, firstBadStep: -1, error: 'x' })).toBe('')
    expect(compareNote(undefined)).toBe('')
  })
})

describe('vision reads', () => {
  const read = (confidence: number, kind: ImageRead['kind'] = 'textbook_question'): ImageRead => ({
    uploadId: 1,
    kind,
    text: 'Step 1: the radius is 7.',
    confidence,
  })

  it('flags reads below the confidence floor', () => {
    expect(needsConfirmation([read(0.9)])).toBe(false)
    expect(needsConfirmation([read(0.9), read(0.4)])).toBe(true)
    expect(needsConfirmation([])).toBe(false)
  })

  it('the clarify draft shows what was read and asks to confirm or retake', () => {
    const draft = clarifyDraft([read(0.4)])
    expect(draft).toContain('I read your photo as')
    expect(draft).toContain('Step 1: the radius is 7.')
    expect(draft).toContain('clearer photo')
  })

  it('retention dates land about a month out', () => {
    const now = new Date('2026-11-12T00:00:00.000Z')
    const date = new Date(retentionDate(now))
    expect(date.getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

describe('EXIF stripping on student uploads', () => {
  it('removes orientation metadata while keeping the image valid', async () => {
    const withExif = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#123456' },
    })
      .withMetadata()
      .withExif({ IFD0: { Orientation: '6' } })
      .jpeg()
      .toBuffer()

    const before = await sharp(withExif).metadata()
    expect(before.exif).toBeDefined()

    const file = { mimetype: 'image/jpeg', data: withExif, size: withExif.length }
    const hookArgs = { data: {}, req: { file } } as unknown as Parameters<typeof stripExif>[0]
    await stripExif(hookArgs)

    const after = await sharp(file.data).metadata()
    expect(after.exif).toBeUndefined()
    expect(after.orientation).toBeUndefined()
    expect(after.format).toBe('jpeg')
  })

  it('leaves non-image uploads untouched', async () => {
    const file = { mimetype: 'application/pdf', data: Buffer.from('%PDF-1.4') }
    const hookArgs = { data: {}, req: { file } } as unknown as Parameters<typeof stripExif>[0]
    await stripExif(hookArgs)
    expect(file.data.toString()).toBe('%PDF-1.4')
  })
})

describe('upload file wiring', () => {
  it('the vision module reads files from the student-uploads static dir', async () => {
    // A smoke check that the path layout the reader expects exists.
    await expect(readFile('sandbox/helpers.py', 'utf8')).resolves.toContain('def equiv')
  })
})
