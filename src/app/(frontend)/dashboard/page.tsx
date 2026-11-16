import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { DashboardDesk } from '@/components/study/DashboardDesk'
import { StudyShell } from '@/components/study/StudyShell'
import { getCurrentUser } from '@/lib/auth'
import { coveragePercent } from '@/lib/mastery'
import type { MockAttempt, TopicMastery } from '@/payload-types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard · Markhall',
}

export default async function DashboardPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in redirect if the database is unreachable.
  }
  if (!user) redirect('/login')

  const payload = await getPayload({ config })

  const masteryRows = await payload
    .find({
      collection: 'topic-mastery',
      where: { user: { equals: user.id } },
      sort: 'mastery',
      limit: 500,
      depth: 1,
      user,
      overrideAccess: false,
    })
    .catch(() => null)
  const masteryDocs: TopicMastery[] = masteryRows?.docs ?? []

  // Subject names for the mastery rows (chapters hydrate one level deep).
  const subjectIds = [
    ...new Set(
      masteryDocs.flatMap((row) =>
        row.chapter && typeof row.chapter === 'object' && row.chapter.subject
          ? [Number(row.chapter.subject)]
          : [],
      ),
    ),
  ]
  const subjectRows = subjectIds.length
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
    (subjectRows?.docs ?? []).map((subject) => [Number(subject.id), subject.name]),
  )

  const seats = masteryDocs.flatMap((row) => {
    const chapter = row.chapter
    if (chapter && typeof chapter === 'object') {
      return [
        {
          chapterId: Number(chapter.id),
          chapterTitle: chapter.title,
          subjectName: subjectNames.get(Number(chapter.subject)) ?? 'Subject',
          mastery: row.mastery ?? 0,
          attempts: row.attempts ?? 0,
        },
      ]
    }
    return []
  })
  const weak = seats.filter((seat) => seat.mastery < 0.6).slice(0, 5)
  const strong = [...seats].reverse().filter((seat) => seat.mastery >= 0.8).slice(0, 3)
  const nextSeat = seats[0] ?? null

  const mockRows = await payload
    .find({
      collection: 'mock-attempts',
      where: { user: { equals: user.id } },
      sort: '-updatedAt',
      limit: 3,
      depth: 0,
      user,
      overrideAccess: false,
    })
    .catch(() => null)
  const mockDocs: MockAttempt[] = mockRows?.docs ?? []
  const recentMocks: {
    attemptId: number
    testId: number
    title: string
    totalMarks: number | null
    score: number | null
    status: string
  }[] = []
  for (const attempt of mockDocs) {
    const testId = typeof attempt.test === 'object' ? attempt.test.id : attempt.test
    const test = await payload
      .findByID({
        collection: 'mock-tests',
        id: testId,
        depth: 0,
        user,
        overrideAccess: false,
      })
      .catch(() => null)
    recentMocks.push({
      attemptId: attempt.id,
      testId,
      title: test?.title ?? 'Mock paper',
      totalMarks: test?.totalMarks ?? null,
      score: attempt.totalScore ?? null,
      status: attempt.status ?? 'unknown',
    })
  }

  const coverage = await coveragePercent(payload, user)

  return (
    <StudyShell
      active="dashboard"
      board={user.board ? user.board.toUpperCase() : 'All boards'}
      coveragePercent={coverage}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      user={{ email: user.email, name: user.name }}
    >
      <DashboardDesk coverage={coverage} nextSeat={nextSeat} recentMocks={recentMocks} strong={strong} weak={weak} />
    </StudyShell>
  )
}
