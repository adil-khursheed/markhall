import { getPayload, type Where } from 'payload'
import config from '@payload-config'

import { recordMastery } from '@/lib/mastery'
import { parseNumeric, scoreMcq } from '@/lib/mock/grade'
import { rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PracticeRequestBody = {
  action?: 'start' | 'answer'
  chapterId?: number
  count?: number
  questionId?: number
  response?: string
  timeMs?: number
}

const DEFAULT_COUNT = 8

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in to practise.' }, { status: 401 })
  if (user.role !== 'student' && user.role !== 'admin') {
    return Response.json({ error: 'Only students can practise.' }, { status: 403 })
  }
  if (!rateLimit(`practice:${user.id}`, 120, 10 * 60 * 1000)) {
    return Response.json({ error: 'Too many requests. Wait a few minutes.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as PracticeRequestBody | null
  if (!body?.action) return Response.json({ error: 'Missing action.' }, { status: 400 })

  const subjectWhere: Where = {}
  if (user.board) subjectWhere.board = { equals: user.board }
  if (user.classLevel != null) subjectWhere.classLevel = { equals: user.classLevel }

  if (body.action === 'start') {
    const subjects = await payload
      .find({
        collection: 'subjects',
        where: Object.keys(subjectWhere).length ? subjectWhere : undefined,
        limit: 50,
        depth: 0,
        user,
        overrideAccess: false,
      })
      .catch(() => null)
    const subjectDocs = subjects?.docs ?? []
    if (!subjectDocs.length) {
      return Response.json({ error: 'No subjects match your profile yet.' }, { status: 409 })
    }

    const chapters = await payload.find({
      collection: 'chapters',
      where: { subject: { in: subjectDocs.map((subject) => subject.id) } },
      limit: 500,
      depth: 1,
      user,
      overrideAccess: false,
    })
    if (!chapters.docs.length) {
      return Response.json({ error: 'Your subjects have no chapters yet.' }, { status: 409 })
    }

    // Default seat: the chapter with the lowest mastery; untried chapters first.
    let chapter = chapters.docs.find((doc) => Number(doc.id) === Number(body.chapterId))
    if (!chapter) {
      const mastery = await payload.find({
        collection: 'topic-mastery',
        where: {
          and: [
            { user: { equals: user.id } },
            { chapter: { in: chapters.docs.map((doc) => doc.id) } },
          ],
        },
        sort: 'mastery',
        limit: 1,
        depth: 0,
        user,
        overrideAccess: false,
      })
      const weakestId = mastery.docs[0] ? Number(mastery.docs[0].chapter) : null
      chapter =
        (weakestId && chapters.docs.find((doc) => Number(doc.id) === weakestId)) || chapters.docs[0]
    }
    const chapterId = Number(chapter.id)

    const pool = await payload.find({
      collection: 'question-bank',
      where: {
        and: [
          { chapter: { equals: chapterId } },
          { status: { equals: 'published' } },
          { type: { in: ['mcq', 'numeric'] } },
          { needsFigure: { not_equals: true } },
        ],
      },
      limit: DEFAULT_COUNT * 3,
      depth: 0,
      user,
      overrideAccess: false,
    })

    // Skip questions the student has already answered in practice.
    const tried = await payload.find({
      collection: 'attempts',
      where: {
        and: [
          { user: { equals: user.id } },
          { question: { in: pool.docs.map((doc) => doc.id) } },
        ],
      },
      limit: 500,
      depth: 0,
      user,
      overrideAccess: false,
    })
    const triedIds = new Set(tried.docs.map((row) => Number(row.question)))

    const questions = pool.docs
      .filter((doc) => !triedIds.has(Number(doc.id)))
      .slice(0, Math.max(1, Math.min(20, body.count ?? DEFAULT_COUNT)))
      .map((doc) => ({
        id: Number(doc.id),
        stem: doc.stem,
        type: doc.type,
        marks: doc.marks,
        options: (doc.options ?? []).map((option) => option.text ?? ''),
      }))

    if (!questions.length) {
      return Response.json(
        { error: 'No published questions for this chapter yet. Try another chapter.' },
        { status: 409 },
      )
    }

    const subject = subjectDocs.find((doc) => Number(doc.id) === Number(chapter!.subject))
    return Response.json({
      chapterId,
      chapterTitle: chapter.title,
      subjectName: subject?.name ?? 'Subject',
      questions,
    })
  }

  if (body.action === 'answer') {
    if (body.questionId == null) return Response.json({ error: 'Missing question.' }, { status: 400 })
    const response = String(body.response ?? '').slice(0, 8000)

    const question = await payload
      .findByID({
        collection: 'question-bank',
        id: body.questionId,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    if (!question) return Response.json({ error: 'That question could not be found.' }, { status: 404 })

    let correct: boolean | null = null
    let correctAnswer: string | null = null

    if (question.type === 'mcq') {
      correct = scoreMcq({ question, response, marks: question.marks }).correct
      correctAnswer = (question.options ?? []).find(
        (option) => (option.text ?? '').trim() === (question.finalAnswer ?? '').trim(),
      )?.text ?? null
    } else if (question.type === 'numeric') {
      const verification = question.verification as
        | { values?: { final?: { num?: number | null } } }
        | null
      const expected = verification?.values?.final?.num ?? null
      const student = parseNumeric(response)
      if (student != null && expected != null) {
        correct = Math.abs(student - expected) <= Math.max(1e-9, Math.abs(expected) * 0.01)
        correctAnswer = question.finalAnswer ?? String(expected)
      }
      // Without a computed reference value the answer cannot be graded.
    }

    if (correct == null) {
      return Response.json({ correct: null, note: 'This answer could not be machine-checked.' })
    }

    await payload.create({
      collection: 'attempts',
      data: {
        user: user.id,
        question: question.id,
        answer: response,
        isCorrect: correct,
        ...(body.timeMs != null && body.timeMs >= 0 ? { timeMs: Math.round(body.timeMs) } : {}),
      },
      depth: 0,
      overrideAccess: true,
    })

    if (question.chapter) {
      await recordMastery(payload, user.id, Number(question.chapter), correct)
    }

    return Response.json({ correct, correctAnswer })
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 })
}
