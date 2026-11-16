import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { PracticeDesk } from '@/components/practice/PracticeDesk'
import { StudyShell } from '@/components/study/StudyShell'
import { getCurrentUser } from '@/lib/auth'
import { coveragePercent } from '@/lib/mastery'
import type { Chapter, Subject } from '@/payload-types'
import type { Where } from 'payload'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Practice · Markhall',
}

type PageProps = {
  searchParams: Promise<{ chapter?: string }>
}

export default async function PracticePage({ searchParams }: PageProps) {
  const { chapter } = await searchParams
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in redirect if the database is unreachable.
  }
  if (!user) redirect('/login')

  const payload = await getPayload({ config })

  const subjectWhere: Where = {}
  if (user.board) subjectWhere.board = { equals: user.board }
  if (user.classLevel != null) subjectWhere.classLevel = { equals: user.classLevel }

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
  const subjectDocs: Subject[] = subjects?.docs ?? []

  const chapters = subjectDocs.length
    ? await payload
        .find({
          collection: 'chapters',
          where: { subject: { in: subjectDocs.map((subject) => subject.id) } },
          limit: 500,
          depth: 0,
          user,
          overrideAccess: false,
        })
        .catch(() => null)
    : null
  const chapterDocs: Chapter[] = chapters?.docs ?? []
  const subjectNames = new Map(subjectDocs.map((subject) => [Number(subject.id), subject.name]))

  const coverage = await coveragePercent(payload, user)

  return (
    <StudyShell
      active="practice"
      board={user.board ? user.board.toUpperCase() : 'All boards'}
      coveragePercent={coverage}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      user={{ email: user.email, name: user.name }}
    >
      <PracticeDesk
        initialChapterId={chapter ? Number(chapter) : undefined}
        chapters={chapterDocs.map((doc) => ({
          id: Number(doc.id),
          title: doc.title,
          subjectName: subjectNames.get(Number(doc.subject)) ?? 'Subject',
        }))}
      />
    </StudyShell>
  )
}
