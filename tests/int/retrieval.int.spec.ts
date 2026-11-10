// @vitest-environment node

import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import { env } from '@/lib/env'
import { vectorSearch, type VectorFilter } from '@/lib/vector/search'
import config from '@/payload.config'

type Embedding = {
  sourceType: 'knowledge' | 'question'
  sourceId: number
  board: 'cbse' | 'icse' | 'up'
  classLevel: number
  subjectId: number
  chapterId?: number | null
  language?: string | null
  difficulty?: string | null
  status?: string | null
}

let payload: Payload
let student: User
let admin: User

function pool() {
  return (payload.db as unknown as PostgresAdapter).pool
}

function unitVector(index = 0) {
  const vector = new Array<number>(env.embeddingDimension).fill(0)
  vector[index] = 1
  return JSON.stringify(vector)
}

async function addEmbedding(row: Embedding) {
  await pool().query(
    `INSERT INTO content_embeddings
      (source_type, source_id, board, class_level, subject_id, chapter_id, language, difficulty, status, content_hash, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)`,
    [
      row.sourceType,
      row.sourceId,
      row.board,
      row.classLevel,
      row.subjectId,
      row.chapterId ?? null,
      row.language ?? 'en',
      row.difficulty ?? null,
      row.status ?? 'published',
      `test-${row.sourceType}-${row.sourceId}`,
      unitVector(),
    ],
  )
}

const searchQuestions = (filter: Omit<VectorFilter, 'sourceType' | 'user'>, user: User) =>
  vectorSearch(
    payload,
    new Array<number>(env.embeddingDimension).fill(0).map((_, index) => (index === 0 ? 1 : 0)),
    { ...filter, sourceType: 'question', user },
    20,
  )

let subjectId: number
let otherSubjectId: number
let chapterOne: number
let chapterTwo: number
let otherChapter: number
let publishedId: number
let draftId: number
let mislabelledId: number
let otherChapterId: number
let otherBoardId: number
let knowledgeId: number
const ids: number[] = []

describe('Phase 3 filtered retrieval', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const stamp = Date.now()
    ids.length = 0

    const adminDoc = await payload.create({
      collection: 'users',
      data: {
        email: `retrieval-admin-${stamp}@markhall.test`,
        name: 'Retrieval admin',
        password: 'test-password',
        role: 'admin',
        board: 'cbse',
        classLevel: 10,
      },
    })
    const studentDoc = await payload.create({
      collection: 'users',
      data: {
        email: `retrieval-student-${stamp}@markhall.test`,
        name: 'Retrieval student',
        password: 'test-password',
        role: 'student',
        board: 'cbse',
        classLevel: 10,
      },
    })
    student = studentDoc
    admin = adminDoc

    const subject = await payload.create({
      collection: 'subjects',
      data: {
        board: 'cbse',
        classLevel: 10,
        name: `Retrieval ${stamp}`,
        code: `RET${stamp}`,
        academicYear: '2025-26',
      },
    })
    const otherSubject = await payload.create({
      collection: 'subjects',
      data: {
        board: 'icse',
        classLevel: 9,
        name: `Retrieval other ${stamp}`,
        code: `RETO${stamp}`,
        academicYear: '2025-26',
      },
    })
    subjectId = subject.id as number
    otherSubjectId = otherSubject.id as number

    const one = await payload.create({
      collection: 'chapters',
      data: { subject: subject.id, number: 1, title: 'Chapter one' },
    })
    const two = await payload.create({
      collection: 'chapters',
      data: { subject: subject.id, number: 2, title: 'Chapter two' },
    })
    const other = await payload.create({
      collection: 'chapters',
      data: { subject: otherSubject.id, number: 1, title: 'Other chapter' },
    })
    chapterOne = one.id as number
    chapterTwo = two.id as number
    otherChapter = other.id as number

    const question = (stem: string, status: 'draft' | 'published', chapter: number, extra = {}) =>
      payload.create({
        collection: 'question-bank',
        data: {
          stem,
          type: 'mcq',
          marks: 1,
          difficulty: 'easy',
          board: 'cbse',
          classLevel: 10,
          subject: subject.id,
          chapter,
          status,
          ...extra,
        } as never,
      })

    const published = await question('Published question', 'published', chapterOne)
    const draft = await question('Draft question', 'draft', chapterOne)
    const mislabelled = await question('Draft question with stale vector', 'draft', chapterOne)
    const chapterItem = await question('Chapter two question', 'published', chapterTwo, {
      language: 'hi',
      difficulty: 'hard',
    })
    const otherBoardQuestion = await payload.create({
      collection: 'question-bank',
      data: {
        stem: 'Other board question',
        type: 'mcq',
        marks: 1,
        difficulty: 'easy',
        board: 'icse',
        classLevel: 9,
        subject: otherSubject.id,
        chapter: other.id,
        status: 'published',
      } as never,
    })
    const knowledge = await payload.create({
      collection: 'knowledge-base',
      data: {
        kind: 'concept',
        chapter: one.id,
        content: 'A retrieval test chunk.',
        board: 'cbse',
        classLevel: 10,
        subject: subject.id,
        language: 'en',
      },
    })

    publishedId = published.id as number
    draftId = draft.id as number
    mislabelledId = mislabelled.id as number
    otherChapterId = chapterItem.id as number
    otherBoardId = otherBoardQuestion.id as number
    knowledgeId = knowledge.id as number
    ids.push(publishedId, draftId, mislabelledId, otherChapterId, otherBoardId, knowledgeId)

    await addEmbedding({
      sourceType: 'question',
      sourceId: publishedId,
      board: 'cbse',
      classLevel: 10,
      subjectId,
      chapterId: chapterOne,
    })
    await addEmbedding({
      sourceType: 'question',
      sourceId: draftId,
      board: 'cbse',
      classLevel: 10,
      subjectId,
      chapterId: chapterOne,
      status: 'draft',
    })
    await addEmbedding({
      sourceType: 'question',
      sourceId: mislabelledId,
      board: 'cbse',
      classLevel: 10,
      subjectId,
      chapterId: chapterOne,
    })
    await addEmbedding({
      sourceType: 'question',
      sourceId: otherChapterId,
      board: 'cbse',
      classLevel: 10,
      subjectId,
      chapterId: chapterTwo,
      language: 'hi',
      difficulty: 'hard',
    })
    await addEmbedding({
      sourceType: 'question',
      sourceId: otherBoardId,
      board: 'icse',
      classLevel: 9,
      subjectId: otherSubjectId,
      chapterId: otherChapter,
    })
    await addEmbedding({
      sourceType: 'knowledge',
      sourceId: knowledgeId,
      board: 'cbse',
      classLevel: 10,
      subjectId,
      chapterId: chapterOne,
    })
  })

  afterAll(async () => {
    if (!payload) return

    try {
      await pool().query(
        `DELETE FROM content_embeddings WHERE source_id = ANY($1::int[])`,
        [ids],
      )
    } catch {
      // The vector table may not exist if the migration was not run.
    }

    const cleanup = async (collection: string, id?: number | string) => {
      if (id === undefined) return
      try {
        await payload.delete({ collection: collection as never, id, overrideAccess: true })
      } catch {
        // Already gone.
      }
    }

    await cleanup('knowledge-base', knowledgeId)
    for (const id of [publishedId, draftId, mislabelledId, otherChapterId, otherBoardId]) {
      await cleanup('question-bank', id)
    }
    await cleanup('chapters', chapterOne)
    await cleanup('chapters', chapterTwo)
    await cleanup('chapters', otherChapter)
    await cleanup('subjects', subjectId)
    await cleanup('subjects', otherSubjectId)
    await cleanup('users', student.id)
    await cleanup('users', admin.id)
  })

  it('filters by board, class and subject', async () => {
    const hits = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId },
      student,
    )
    const result = hits.map((hit) => hit.id)

    expect(result).toContain(publishedId)
    expect(result).toContain(otherChapterId)
    expect(result).not.toContain(otherBoardId)
    expect(result).not.toContain(draftId)
    expect(result).not.toContain(mislabelledId)
  })

  it('returns only published items', async () => {
    const hits = await searchQuestions({ board: 'cbse', classLevel: 10 }, student)
    const result = hits.map((hit) => hit.id)

    expect(result).toContain(publishedId)
    expect(result).not.toContain(draftId)
    expect(result).not.toContain(mislabelledId)
  })

  it('applies chapter and language filters', async () => {
    const chapterHits = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId, chapterId: chapterTwo },
      student,
    )
    const englishHits = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId, chapterId: chapterTwo, language: 'en' },
      student,
    )

    expect(chapterHits.map((hit) => hit.id)).toEqual([otherChapterId])
    expect(englishHits).toHaveLength(0)
  })

  it('returns an empty list when no row matches', async () => {
    const hits = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId: 999_999 },
      student,
    )

    expect(hits).toEqual([])
  })

  it('applies access control when hydrating rows', async () => {
    const asStudent = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId, chapterId: chapterOne },
      student,
    )
    const asAdmin = await searchQuestions(
      { board: 'cbse', classLevel: 10, subjectId, chapterId: chapterOne },
      admin,
    )

    expect(asStudent.map((hit) => hit.id)).not.toContain(mislabelledId)
    expect(asAdmin.map((hit) => hit.id)).toContain(mislabelledId)
  })

  it('hydrates knowledge chunks for the signed-in user', async () => {
    const filter = { board: 'cbse' as const, classLevel: 10, subjectId, chapterId: chapterOne }
    const queryVec = new Array<number>(env.embeddingDimension).fill(0)
    queryVec[0] = 1

    const asStudent = await vectorSearch(payload, queryVec, {
      ...filter,
      sourceType: 'knowledge',
      user: student,
    })
    const asAdmin = await vectorSearch(payload, queryVec, {
      ...filter,
      sourceType: 'knowledge',
      user: admin,
    })

    expect(asStudent.map((hit) => hit.id)).toContain(knowledgeId)
    expect(asAdmin.map((hit) => hit.id)).toContain(knowledgeId)
  })
})
