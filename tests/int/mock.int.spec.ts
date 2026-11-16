// @vitest-environment node

import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
let studentId: number
let otherStudentId: number
let subjectId: number
let publishedQuestionId: number
let draftQuestionId: number

const emails: string[] = []

async function createUser(name: string, role: 'admin' | 'student') {
  const stamp = Date.now() + Math.floor(Math.random() * 100000)
  const email = `${name}-${stamp}@markhall.test`
  emails.push(email)
  return payload.create({
    collection: 'users',
    data: { email, name, password: 'test-password', role },
  })
}

describe('Phase 9 mock tests', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    await createUser('phase9 admin', 'admin')
    const student = await createUser('phase9 student', 'student')
    const other = await createUser('phase9 other', 'student')
    studentId = student.id
    otherStudentId = other.id

    const subject = await payload.create({
      collection: 'subjects',
      data: { board: 'cbse', classLevel: 10, name: `Phase 9 Subject ${Date.now()}`, code: 'P9', academicYear: '2026-27' },
      draft: false,
      overrideAccess: true,
    })
    subjectId = subject.id

    const chapter = await payload.create({
      collection: 'chapters',
      data: { subject: subjectId, number: 1, title: 'Phase 9 Chapter' },
      overrideAccess: true,
    })

    const published = await payload.create({
      collection: 'question-bank',
      data: {
        stem: 'What is $2 + 2$?',
        type: 'mcq',
        options: [
          { label: 'A', text: '4' },
          { label: 'B', text: '5' },
        ],
        marks: 1,
        difficulty: 'easy',
        board: 'cbse',
        classLevel: 10,
        subject: subjectId,
        chapter: chapter.id,
        finalAnswer: '4',
        origin: 'teacher',
        status: 'published',
      },
      overrideAccess: true,
      context: { skipEmbedQueue: true },
      draft: false,
    })
    publishedQuestionId = published.id

    const draft = await payload.create({
      collection: 'question-bank',
      data: {
        stem: 'Draft question.',
        type: 'short',
        marks: 3,
        difficulty: 'medium',
        board: 'cbse',
        classLevel: 10,
        subject: subjectId,
        chapter: chapter.id,
        origin: 'teacher',
        status: 'draft',
      },
      overrideAccess: true,
      context: { skipEmbedQueue: true },
      draft: false,
    })
    draftQuestionId = draft.id
  })

  afterAll(async () => {
    await payload.delete({ collection: 'users', where: { email: { in: emails } }, overrideAccess: true })
  })

  it('lets students read a published shared test', async () => {
    const test = await payload.create({
      collection: 'mock-tests',
      data: {
        title: `Shared paper ${Date.now()}`,
        board: 'cbse',
        classLevel: 10,
        subject: subjectId,
        durationMinutes: 30,
        totalMarks: 1,
        sections: [{ name: 'Paper', questions: [publishedQuestionId] }],
        status: 'published',
      },
      overrideAccess: true,
    })

    const asStudent = await payload.find({
      collection: 'mock-tests',
      user: { id: studentId, role: 'student' } as never,
      overrideAccess: false,
      where: { id: { equals: test.id } },
    })
    expect(asStudent.docs).toHaveLength(1)
  })

  it('hides in_review tests from students', async () => {
    const test = await payload.create({
      collection: 'mock-tests',
      data: {
        title: `Review paper ${Date.now()}`,
        board: 'cbse',
        classLevel: 10,
        subject: subjectId,
        durationMinutes: 30,
        totalMarks: 3,
        sections: [{ name: 'Paper', questions: [publishedQuestionId, draftQuestionId] }],
        status: 'in_review',
      },
      overrideAccess: true,
    })

    const asStudent = await payload.find({
      collection: 'mock-tests',
      user: { id: studentId, role: 'student' } as never,
      overrideAccess: false,
      where: { id: { equals: test.id } },
    })
    expect(asStudent.docs).toHaveLength(0)
  })

  it('shows a personal published test only to its student', async () => {
    const test = await payload.create({
      collection: 'mock-tests',
      data: {
        title: `Personal paper ${Date.now()}`,
        board: 'cbse',
        classLevel: 10,
        subject: subjectId,
        durationMinutes: 30,
        totalMarks: 1,
        sections: [{ name: 'Paper', questions: [publishedQuestionId] }],
        generatedFor: studentId,
        status: 'published',
      },
      overrideAccess: true,
    })

    const own = await payload.find({
      collection: 'mock-tests',
      user: { id: studentId, role: 'student' } as never,
      overrideAccess: false,
      where: { id: { equals: test.id } },
    })
    const theirs = await payload.find({
      collection: 'mock-tests',
      user: { id: otherStudentId, role: 'student' } as never,
      overrideAccess: false,
      where: { id: { equals: test.id } },
    })
    expect(own.docs).toHaveLength(1)
    expect(theirs.docs).toHaveLength(0)
  })

  it('refuses to publish a test that contains an unpublished question', async () => {
    await expect(
      payload.create({
        collection: 'mock-tests',
        data: {
          title: `Gated paper ${Date.now()}`,
          board: 'cbse',
          classLevel: 10,
          subject: subjectId,
          durationMinutes: 30,
          totalMarks: 3,
          sections: [{ name: 'Paper', questions: [publishedQuestionId, draftQuestionId] }],
          status: 'published',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow('Every question in a mock test must be published first.')
  })

  it('keeps score fields out of student writes and attempts owner-only', async () => {
    const attempt = await payload.create({
      collection: 'mock-attempts',
      data: {
        user: studentId,
        test: (
          await payload.find({
            collection: 'mock-tests',
            where: { status: { equals: 'published' } },
            limit: 1,
            overrideAccess: true,
          })
        ).docs[0].id,
        startedAt: new Date().toISOString(),
        answers: [{ question: publishedQuestionId, response: '' }],
      },
      overrideAccess: true,
    })

    // Another student cannot read or update it.
    await expect(
      payload.findByID({
        collection: 'mock-attempts',
        id: attempt.id,
        user: { id: otherStudentId, role: 'student' } as never,
        overrideAccess: false,
      }),
    ).rejects.toThrow()

    // The owner can update the attempt, but score fields are admin-only.
    const updated = await payload.update({
      collection: 'mock-attempts',
      id: attempt.id,
      data: { status: 'submitted' },
      user: { id: studentId, role: 'student' } as never,
      overrideAccess: false,
    })
    expect(updated.status).toBe('submitted')
    const reread = await payload.findByID({
      collection: 'mock-attempts',
      id: attempt.id,
      overrideAccess: true,
    })
    expect(reread.totalScore == null || reread.totalScore === 0).toBe(true)
  })
})
