// @vitest-environment node

import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let png: Buffer

let payload: Payload
let adminId: number | string
let studentId: number | string
let otherStudentId: number | string
let publicStudentId: number | string
let subjectId: number | string
let chapterId: number | string
let draftQuestionId: number | string
let publishedQuestionId: number | string
let uploadId: number | string

describe('Phase 1 access control', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    png = await sharp({
      create: { width: 2, height: 2, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer()

    const stamp = Date.now()
    const admin = await payload.create({
      collection: 'users',
      data: {
        email: `admin-${stamp}@markhall.test`,
        name: 'Test admin',
        password: 'test-password',
        role: 'admin',
      },
    })
    const student = await payload.create({
      collection: 'users',
      data: {
        email: `student-${stamp}@markhall.test`,
        name: 'Test student',
        password: 'test-password',
        role: 'student',
      },
    })
    const other = await payload.create({
      collection: 'users',
      data: {
        email: `other-${stamp}@markhall.test`,
        name: 'Other student',
        password: 'test-password',
        role: 'student',
      },
    })

    const publicSignup = await payload.create({
      collection: 'users',
      data: {
        email: `signup-${stamp}@markhall.test`,
        name: 'Public signup',
        password: 'test-password',
        role: 'admin',
      },
      context: { publicSignup: true },
      overrideAccess: true,
    })

    adminId = admin.id
    studentId = student.id
    otherStudentId = other.id
    publicStudentId = publicSignup.id

    const subject = await payload.create({
      collection: 'subjects',
      data: {
        board: 'cbse',
        classLevel: 10,
        name: 'Science',
        code: `SCI-${stamp}`,
        academicYear: '2025-26',
      },
    })
    subjectId = subject.id

    const chapter = await payload.create({
      collection: 'chapters',
      data: {
        subject: subject.id,
        number: 1,
        title: 'Chemical reactions',
        weightageMarks: 6,
      },
    })
    chapterId = chapter.id

    const baseQuestion = {
      board: 'cbse' as const,
      classLevel: 10,
      subject: subject.id,
      chapter: chapter.id,
      marks: 1,
      difficulty: 'easy' as const,
      type: 'mcq' as const,
      options: [
        { label: 'A' as const, text: 'Option A' },
        { label: 'B' as const, text: 'Option B' },
      ],
      canonicalSolution: 'Internal solution',
      finalAnswer: 'A',
      verification: { script: 'internal-check' },
      reviewNotes: 'Internal review note',
      origin: 'generated' as const,
    }

    const draft = await payload.create({
      collection: 'question-bank',
      data: { ...baseQuestion, stem: 'Draft question?', status: 'draft' },
    })
    const published = await payload.create({
      collection: 'question-bank',
      data: { ...baseQuestion, stem: 'Published question?', status: 'published' },
    })
    draftQuestionId = draft.id
    publishedQuestionId = published.id

    const upload = await payload.create({
      collection: 'student-uploads',
      data: { owner: student.id, purpose: 'doubt' },
      file: {
        data: png,
        mimetype: 'image/png',
        name: `answer-${stamp}.png`,
        size: png.length,
      },
    })
    uploadId = upload.id
  })

  afterAll(async () => {
    if (!payload) return

    const cleanup = async (collection: string, id?: number | string) => {
      if (id === undefined) return
      try {
        await payload.delete({ collection: collection as never, id, overrideAccess: true })
      } catch {
        // Already gone.
      }
    }

    await cleanup('student-uploads', uploadId)
    await cleanup('question-bank', draftQuestionId)
    await cleanup('question-bank', publishedQuestionId)
    await cleanup('chapters', chapterId)
    await cleanup('subjects', subjectId)
    await cleanup('users', publicStudentId)
    await cleanup('users', otherStudentId)
    await cleanup('users', studentId)
    await cleanup('users', adminId)

  })

  it('forces public signups to student after setup', async () => {
    const doc = await payload.findByID({
      collection: 'users',
      id: publicStudentId,
      overrideAccess: true,
    })

    expect(doc.role).toBe('student')
  })

  it('shows students only published questions', async () => {
    const { docs } = await payload.find({
      collection: 'question-bank',
      overrideAccess: false,
      user: { id: studentId, role: 'student' } as never,
    })

    const ids = docs.map((doc) => doc.id)
    expect(ids).toContain(publishedQuestionId)
    expect(ids).not.toContain(draftQuestionId)
  })

  it('shows admins draft questions', async () => {
    const { docs } = await payload.find({
      collection: 'question-bank',
      overrideAccess: false,
      user: { id: adminId, role: 'admin' } as never,
    })

    const ids = docs.map((doc) => doc.id)
    expect(ids).toContain(publishedQuestionId)
    expect(ids).toContain(draftQuestionId)
  })

  it('hides verification and review notes from students', async () => {
    const doc = await payload.findByID({
      collection: 'question-bank',
      id: publishedQuestionId,
      overrideAccess: false,
      user: { id: studentId, role: 'student' } as never,
    })

    expect(doc.stem).toBe('Published question?')
    expect(doc.verification).toBeUndefined()
    expect(doc.reviewNotes).toBeUndefined()
    expect(doc.canonicalSolution).toBeUndefined()
  })

  it('shows internal review fields to admins', async () => {
    const doc = await payload.findByID({
      collection: 'question-bank',
      id: publishedQuestionId,
      overrideAccess: false,
      user: { id: adminId, role: 'admin' } as never,
    })

    expect(doc.verification).toEqual({ script: 'internal-check' })
    expect(doc.reviewNotes).toBe('Internal review note')
    expect(doc.canonicalSolution).toBe('Internal solution')
  })

  it('limits student uploads to their owner', async () => {
    const own = await payload.find({
      collection: 'student-uploads',
      overrideAccess: false,
      user: { id: studentId, role: 'student' } as never,
    })
    const other = await payload.find({
      collection: 'student-uploads',
      overrideAccess: false,
      user: { id: otherStudentId, role: 'student' } as never,
    })

    expect(own.docs.map((doc) => doc.id)).toContain(uploadId)
    expect(other.docs.map((doc) => doc.id)).not.toContain(uploadId)
  })

  it('gives admins access to every upload', async () => {
    const { docs } = await payload.find({
      collection: 'student-uploads',
      overrideAccess: false,
      user: { id: adminId, role: 'admin' } as never,
    })

    expect(docs.map((doc) => doc.id)).toContain(uploadId)
  })
})
