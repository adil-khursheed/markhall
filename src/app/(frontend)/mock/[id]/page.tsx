import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

import { MockButton, MockShell } from '@/components/mock/MockShell'
import { TestRun } from '@/components/mock/TestRun'
import { getCurrentUser, requireCompleteProfile } from '@/lib/auth'
import { timeLeftMs } from '@/lib/mock/grade'
import { relationId } from '@/lib/ingest/utils'
import type { MockAttempt, MockTest, QuestionBank } from '@/payload-types'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ id: string }>
}

function Stem({ children }: { children: string }) {
  return (
    <div className="mock-stem">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default async function MockTestPage({ params }: PageProps) {
  const { id } = await params
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in redirect if the database is unreachable.
  }
  if (!user) redirect('/login')

  requireCompleteProfile(user)

  const payload = await getPayload({ config })

  const test: MockTest | null = await payload
    .findByID({ collection: 'mock-tests', id, depth: 0, user, overrideAccess: false })
    .catch(() => null)
  if (!test || test.status !== 'published') notFound()

  const attemptResults = await payload
    .find({
      collection: 'mock-attempts',
      where: {
        and: [
          { user: { equals: user.id } },
          { test: { equals: Number(id) } },
        ],
      },
      sort: '-createdAt',
      limit: 1,
      depth: 0,
      user,
      overrideAccess: false,
    })
    .catch(() => null)
  const attempt: MockAttempt | undefined = attemptResults?.docs[0]

  // An attempt still inside its deadline is the timed paper.
  if (
    attempt?.status === 'in_progress' &&
    attempt.deadlineAt &&
    timeLeftMs(attempt.deadlineAt) > 0
  ) {
    const questionIds = (attempt.answers ?? []).map((row) => Number(relationId(row.question)))
    const questionResults = questionIds.length
      ? await payload
          .find({
            collection: 'question-bank',
            where: { id: { in: questionIds } },
            limit: 100,
            depth: 0,
            user,
            overrideAccess: false,
          })
          .catch(() => null)
      : null
    const questions = (questionResults?.docs ?? []).map((doc) => ({
      id: Number(doc.id),
      stem: doc.stem,
      type: doc.type,
      marks: doc.marks,
      options: (doc.options ?? []).map((option) => option.text ?? ''),
    }))
    const responses = Object.fromEntries(
      (attempt.answers ?? []).map((row) => [Number(relationId(row.question)), row.response ?? '']),
    )

    return (
      <MockShell
        board={user.board ? user.board.toUpperCase() : 'All boards'}
        grade={user.classLevel != null ? String(user.classLevel) : '—'}
        user={{ email: user.email, name: user.name }}
      >
        <TestRun
          attemptId={attempt.id}
          deadlineAt={attempt.deadlineAt}
          questions={questions}
          responses={responses}
          testId={test.id}
          title={test.title}
        />
      </MockShell>
    )
  }

  // Deadline passed but the attempt was never closed (e.g. the tab was shut).
  if (attempt?.status === 'in_progress') {
    return (
      <MockShell
        board={user.board ? user.board.toUpperCase() : 'All boards'}
        grade={user.classLevel != null ? String(user.classLevel) : '—'}
        user={{ email: user.email, name: user.name }}
      >
        <section className="mock-intro">
          <h1>{test.title}</h1>
          <p className="mock-banner">
            Your time ran out. Close the attempt to have the saved answers graded.
          </p>
          <MockButton
            action="submit"
            attemptId={attempt.id}
            busyLabel="Closing…"
            className="button button-primary"
            label="Close and grade"
          />
        </section>
      </MockShell>
    )
  }

  // After submission: the marked paper, or a grading notice.
  if (attempt) {
    const questionIds = (attempt.answers ?? []).map((row) => Number(relationId(row.question)))
    const questionResults = questionIds.length
      ? await payload
          .find({
            collection: 'question-bank',
            where: { id: { in: questionIds } },
            limit: 100,
            depth: 1,
            user,
            overrideAccess: false,
          })
          .catch(() => null)
      : null
    const byId = new Map((questionResults?.docs ?? []).map((doc) => [Number(doc.id), doc]))

    const rows = (attempt.answers ?? []).map((row) => {
      const doc = byId.get(Number(relationId(row.question)))
      return { row, doc }
    })
    const pendingGrading = attempt.status === 'submitted' || attempt.status === 'expired'
    const provisional = rows.some((entry) => entry.row.gradingStatus === 'needs_review')

    // Next revision: the chapter of the first answer that lost marks.
    const lost = rows.find(
      (entry) => entry.doc && (entry.row.finalScore ?? 0) < entry.doc.marks,
    )
    const lostChapter =
      lost?.doc?.chapter && typeof lost.doc.chapter === 'object' ? lost.doc.chapter.title : null

    return (
      <MockShell
        board={user.board ? user.board.toUpperCase() : 'All boards'}
        grade={user.classLevel != null ? String(user.classLevel) : '—'}
        user={{ email: user.email, name: user.name }}
      >
        <section className="mock-results">
          <header className="mock-results-head">
            <h1>{test.title} — marked paper</h1>
            <p className="mock-score">
              {attempt.totalScore == null ? '—' : attempt.totalScore} / {test.totalMarks} marks
            </p>
            {pendingGrading && (
              <p className="mock-banner">
                Your paper is being graded. This page shows your score once marking finishes.{' '}
                <Link className="mock-link" href={`/mock/${test.id}`}>
                  Check again
                </Link>
              </p>
            )}
            {provisional && !pendingGrading && (
              <p className="mock-banner is-provisional">
                Some answers are marked provisionally and are being checked by a reviewer.
              </p>
            )}
            {lostChapter && !pendingGrading && (
              <p className="mock-next">
                Next revision: <strong>{lostChapter}</strong> — that chapter lost the most marks here.
              </p>
            )}
            {provisional && !pendingGrading && !attempt.reviewRequested && (
              <MockButton
                action="review"
                attemptId={attempt.id}
                busyLabel="Requesting…"
                className="button"
                label="Request human review"
              />
            )}
            {attempt.reviewRequested && (
              <p className="mock-note">You asked for a human review of this paper.</p>
            )}
          </header>

          <ol className="mock-result-rows">
            {rows.map((entry, index) => {
              if (!entry.doc) return null
              const doc: QuestionBank = entry.doc
              const score = entry.row.finalScore
              const lostMarks = score == null || score < doc.marks
              return (
                <li className={`mock-result-row${lostMarks ? ' is-lost' : ''}`} key={index}>
                  <div className="mock-result-head">
                    <span>Q{index + 1}</span>
                    <span className="mock-result-marks">
                      {score == null ? 'Pending' : `${score} / ${doc.marks}`}
                    </span>
                  </div>
                  <Stem>{doc.stem}</Stem>
                  {(entry.row.response ?? '').trim() && (
                    <p className="mock-your-answer">
                      <strong>Your answer:</strong> {entry.row.response}
                    </p>
                  )}
                  {entry.row.feedback && <p className="mock-feedback">{entry.row.feedback}</p>}
                </li>
              )
            })}
          </ol>
        </section>
      </MockShell>
    )
  }

  // No attempt yet: the paper cover sheet.
  return (
    <MockShell
      board={user.board ? user.board.toUpperCase() : 'All boards'}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      user={{ email: user.email, name: user.name }}
    >
      <section className="mock-intro">
        <h1>{test.title}</h1>
        <ul className="mock-intro-list">
          <li>{test.durationMinutes} minutes, timed on the server</li>
          <li>{test.totalMarks} marks</li>
          {test.negativeMarking ? <li>−{test.negativeMarking} for each wrong answer</li> : null}
          <li>Answers autosave until the deadline; late answers are rejected</li>
          <li>Solutions and marks are released after you submit</li>
        </ul>
        <p className="mock-intro-note">Once you start, the clock does not stop — even if you close the page.</p>
        <MockButton action="start" busyLabel="Starting…" label="Start the paper" testId={test.id} />
      </section>
    </MockShell>
  )
}
