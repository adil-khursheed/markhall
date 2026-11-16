import { getPayload } from 'payload'
import config from '@payload-config'

import { relationId } from '@/lib/ingest/utils'
import { rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MockRequestBody = {
  action?: 'start' | 'autosave' | 'attach' | 'submit' | 'review'
  testId?: number
  attemptId?: number
  questionId?: number
  uploadId?: number
  responses?: { questionId: number; response: string }[]
}

const MAX_RESPONSE_LENGTH = 8000
const MAX_ATTACHMENTS = 4

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in to take a mock test.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as MockRequestBody | null
  if (!body?.action) return Response.json({ error: 'Missing action.' }, { status: 400 })

  // Autosaves fire every few seconds, so the window is generous.
  if (!rateLimit(`mock:${user.id}`, 240, 10 * 60 * 1000)) {
    return Response.json({ error: 'Too many requests. Wait a few minutes.' }, { status: 429 })
  }

  const loadAttempt = async () => {
    if (body.attemptId == null) return null
    try {
      return await payload.findByID({
        collection: 'mock-attempts',
        id: body.attemptId,
        depth: 0,
        user,
        overrideAccess: false,
      })
    } catch {
      return null
    }
  }

  if (body.action === 'start') {
    if (body.testId == null) return Response.json({ error: 'Missing test.' }, { status: 400 })

    const test = await payload
      .findByID({
        collection: 'mock-tests',
        id: body.testId,
        depth: 0,
        user,
        overrideAccess: false,
      })
      .catch(() => null)
    if (!test) return Response.json({ error: 'That paper could not be found.' }, { status: 404 })
    if (test.status !== 'published') {
      return Response.json({ error: 'That paper is not published yet.' }, { status: 403 })
    }

    // Resume an in-progress attempt instead of restarting the clock.
    const existing = await payload.find({
      collection: 'mock-attempts',
      where: {
        and: [
          { user: { equals: user.id } },
          { test: { equals: test.id } },
          { status: { equals: 'in_progress' } },
        ],
      },
      limit: 1,
      depth: 0,
      user,
      overrideAccess: false,
    })
    if (existing.docs[0]) {
      const attempt = existing.docs[0]
      if (attempt.deadlineAt && new Date(attempt.deadlineAt).getTime() > Date.now()) {
        return Response.json({ attempt: { id: attempt.id, deadlineAt: attempt.deadlineAt }, resumed: true })
      }
      // A stale in-progress attempt past its deadline closes and grades.
      await payload.update({
        collection: 'mock-attempts',
        id: attempt.id,
        data: { status: 'expired' },
        user,
        overrideAccess: false,
      })
      await payload.jobs.queue({ task: 'gradeMockAttempt', input: { attemptId: attempt.id } })
    }

    const questionIds = (test.sections ?? []).flatMap((section) => section.questions ?? [])
    if (!questionIds.length) {
      return Response.json({ error: 'That paper has no questions yet.' }, { status: 409 })
    }

    const now = new Date()
    const created = await payload.create({
      collection: 'mock-attempts',
      data: {
        user: user.id,
        test: test.id,
        startedAt: now.toISOString(),
        deadlineAt: new Date(now.getTime() + test.durationMinutes * 60_000).toISOString(),
        answers: questionIds.map((question) => ({ question, response: '' })),
      },
      user,
      overrideAccess: false,
    })

    return Response.json({ attempt: { id: created.id, deadlineAt: created.deadlineAt }, resumed: false })
  }

  const attempt = await loadAttempt()
  if (!attempt) return Response.json({ error: 'That attempt could not be found.' }, { status: 404 })

  if (body.action === 'autosave') {
    if (attempt.status !== 'in_progress') {
      return Response.json({ error: 'That paper was already submitted.' }, { status: 409 })
    }
    // Autosave is accepted only until the server deadline.
    if (attempt.deadlineAt && Date.now() > new Date(attempt.deadlineAt).getTime()) {
      await payload.update({
        collection: 'mock-attempts',
        id: attempt.id,
        data: { status: 'expired' },
        user,
        overrideAccess: false,
      })
      await payload.jobs.queue({ task: 'gradeMockAttempt', input: { attemptId: attempt.id } })
      return Response.json({ error: 'Time is up. Your saved answers were submitted.' }, { status: 410 })
    }

    const answers = [...(attempt.answers ?? [])]
    let changed = 0
    for (const item of body.responses ?? []) {
      const index = answers.findIndex(
        (row) => Number(relationId(row.question)) === Number(item.questionId),
      )
      if (index === -1) continue
      answers[index] = { ...answers[index], response: String(item.response ?? '').slice(0, MAX_RESPONSE_LENGTH) }
      changed += 1
    }
    if (changed) {
      await payload.update({
        collection: 'mock-attempts',
        id: attempt.id,
        data: { answers },
        user,
        overrideAccess: false,
      })
    }
    return Response.json({ ok: true, saved: changed })
  }

  if (body.action === 'attach') {
    if (attempt.status !== 'in_progress') {
      return Response.json({ error: 'That paper was already submitted.' }, { status: 409 })
    }
    if (attempt.deadlineAt && Date.now() > new Date(attempt.deadlineAt).getTime()) {
      return Response.json({ error: 'Time is up.' }, { status: 410 })
    }
    if (body.questionId == null || body.uploadId == null) {
      return Response.json({ error: 'Missing question or photo.' }, { status: 400 })
    }
    try {
      const upload = await payload.findByID({
        collection: 'student-uploads',
        id: body.uploadId,
        depth: 0,
        user,
        overrideAccess: false,
      })
      const ownerId = typeof upload.owner === 'object' && upload.owner ? upload.owner.id : upload.owner
      if (ownerId !== user.id) {
        return Response.json({ error: 'You can only attach your own photos.' }, { status: 403 })
      }
      await payload.update({
        collection: 'student-uploads',
        id: body.uploadId,
        depth: 0,
        user,
        overrideAccess: false,
        data: { attempt: attempt.id },
      })
    } catch {
      return Response.json({ error: 'That photo could not be found.' }, { status: 404 })
    }

    const answers = [...(attempt.answers ?? [])]
    const index = answers.findIndex(
      (row) => Number(relationId(row.question)) === Number(body.questionId),
    )
    if (index === -1) return Response.json({ error: 'That question is not on this paper.' }, { status: 400 })
    const row = answers[index]
    const images = [...(row.images ?? []).map((id) => Number(id)), Number(body.uploadId)].slice(0, MAX_ATTACHMENTS)
    answers[index] = { ...row, images }
    await payload.update({
      collection: 'mock-attempts',
      id: attempt.id,
      data: { answers },
      user,
      overrideAccess: false,
    })
    return Response.json({ ok: true, images: images.length })
  }

  if (body.action === 'submit') {
    // The submit request carries no answers: late answer writes are rejected
    // by autosave, so a late submit only closes and grades what was saved.
    if (attempt.status !== 'in_progress') return Response.json({ ok: true, already: true })
    const now = new Date()
    const late = Boolean(attempt.deadlineAt && now.getTime() > new Date(attempt.deadlineAt).getTime())
    await payload.update({
      collection: 'mock-attempts',
      id: attempt.id,
      data: { status: late ? 'expired' : 'submitted', submittedAt: now.toISOString() },
      user,
      overrideAccess: false,
    })
    await payload.jobs.queue({ task: 'gradeMockAttempt', input: { attemptId: attempt.id } })
    return Response.json({ ok: true })
  }

  if (body.action === 'review') {
    if (attempt.reviewRequested) return Response.json({ ok: true, already: true })
    await payload.update({
      collection: 'mock-attempts',
      id: attempt.id,
      data: { reviewRequested: true },
      user,
      overrideAccess: false,
    })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action.' }, { status: 400 })
}
