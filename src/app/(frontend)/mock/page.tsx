import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { MockShell } from '@/components/mock/MockShell'
import { getCurrentUser, requireCompleteProfile } from '@/lib/auth'
import { timeLeftMs } from '@/lib/mock/grade'
import { relationId } from '@/lib/ingest/utils'
import type { MockAttempt, MockTest } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Mock tests · Markhall',
}

export default async function MockPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in redirect if the database is unreachable.
  }
  if (!user) redirect('/login')

  requireCompleteProfile(user)

  const payload = await getPayload({ config })

  const testResults = await payload
    .find({
      collection: 'mock-tests',
      user,
      overrideAccess: false,
      sort: '-createdAt',
      limit: 20,
      depth: 0,
    })
    .catch(() => null)
  const testDocs: MockTest[] = testResults?.docs ?? []

  const subjectIds = [...new Set(testDocs.map((test) => Number(test.subject)))]
  const subjectResults = subjectIds.length
    ? await payload
        .find({
          collection: 'subjects',
          where: { id: { in: subjectIds } },
          limit: 50,
          depth: 0,
          overrideAccess: true,
        })
        .catch(() => null)
    : null
  const subjectNames = new Map(
    (subjectResults?.docs ?? []).map((subject) => [Number(subject.id), subject.name]),
  )

  const attemptResults = await payload
    .find({
      collection: 'mock-attempts',
      where: { user: { equals: user.id } },
      sort: '-updatedAt',
      limit: 10,
      depth: 0,
      user,
      overrideAccess: false,
    })
    .catch(() => null)
  const attemptDocs: MockAttempt[] = attemptResults?.docs ?? []

  // Titles for attempts whose paper did not make the list page cut.
  const testTitles = new Map(testDocs.map((test) => [Number(test.id), test]))
  for (const attempt of attemptDocs) {
    const testId = Number(relationId(attempt.test))
    if (!testTitles.has(testId)) {
      const test = await payload
        .findByID({ collection: 'mock-tests', id: testId, depth: 0, user, overrideAccess: false })
        .catch(() => null)
      if (test) testTitles.set(testId, test)
    }
  }

  const resumable = attemptDocs.filter(
    (attempt) => attempt.status === 'in_progress' && timeLeftMs(attempt.deadlineAt) > 0,
  )
  const finished = attemptDocs.filter((attempt) => !resumable.includes(attempt))

  return (
    <MockShell
      board={user.board ? user.board.toUpperCase() : 'All boards'}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      user={{ email: user.email, name: user.name }}
    >
      <section className="mock-list">
        <header className="mock-list-head">
          <h1>Mock tests</h1>
          <p>Timed papers with server deadlines. Answers autosave until the clock runs out.</p>
        </header>

        {resumable.length > 0 && (
          <div className="mock-section">
            <h2>Resume</h2>
            <ul className="mock-cards">
              {resumable.map((attempt) => {
                const test = testTitles.get(Number(relationId(attempt.test)))
                const minutesLeft = Math.max(1, Math.ceil(timeLeftMs(attempt.deadlineAt) / 60000))
                return (
                  <li className="mock-card is-live" key={attempt.id}>
                    <p className="mock-card-title">{test?.title ?? 'Mock paper'}</p>
                    <p className="mock-card-meta">Time left: about {minutesLeft} min</p>
                    <Link className="button button-primary" href={`/mock/${relationId(attempt.test)}`}>
                      Resume
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="mock-section">
          <h2>Available papers</h2>
          {testDocs.length === 0 ? (
            <p className="mock-empty">No papers are published for you yet. Ask your admin to build one.</p>
          ) : (
            <ul className="mock-cards">
              {testDocs.map((test) => (
                <li className="mock-card" key={test.id}>
                  <p className="mock-card-title">{test.title}</p>
                  <p className="mock-card-meta">
                    {subjectNames.get(Number(test.subject)) ?? 'Subject'} · {test.durationMinutes} min ·{' '}
                    {test.totalMarks} marks
                    {test.negativeMarking ? ` · −${test.negativeMarking} per wrong answer` : ''}
                  </p>
                  <Link className="button" href={`/mock/${test.id}`}>
                    Open paper
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {finished.length > 0 && (
          <div className="mock-section">
            <h2>Your attempts</h2>
            <table className="mock-attempts">
              <thead>
                <tr>
                  <th scope="col">Paper</th>
                  <th scope="col">Status</th>
                  <th scope="col">Score</th>
                  <th scope="col">Open</th>
                </tr>
              </thead>
              <tbody>
                {finished.map((attempt) => {
                  const test = testTitles.get(Number(relationId(attempt.test)))
                  return (
                    <tr key={attempt.id}>
                      <td>{test?.title ?? 'Mock paper'}</td>
                      <td>
                        {attempt.status === 'graded'
                          ? 'Graded'
                          : attempt.status === 'expired'
                            ? 'Closed at the deadline'
                            : 'Grading…'}
                      </td>
                      <td>
                        {attempt.totalScore == null
                          ? '—'
                          : `${attempt.totalScore} / ${test?.totalMarks ?? '?'}`}
                      </td>
                      <td>
                        <Link className="mock-link" href={`/mock/${relationId(attempt.test)}`}>
                          {attempt.status === 'graded' ? 'Review' : 'Check again'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </MockShell>
  )
}
