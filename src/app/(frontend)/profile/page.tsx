import { redirect } from 'next/navigation'

import { ProfileForm } from '@/components/profile/ProfileForm'
import { StudyShell } from '@/components/study/StudyShell'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Your profile · Markhall',
}

export default async function ProfilePage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in redirect if the database is unreachable.
  }
  if (!user) redirect('/login')

  const incomplete = user.role === 'student' && (!user.board || user.classLevel == null)

  return (
    <StudyShell
      active="profile"
      board={user.board ? user.board.toUpperCase() : 'Not set'}
      grade={user.classLevel != null ? String(user.classLevel) : '—'}
      user={{ email: user.email, name: user.name }}
    >
      <section className="profile-desk" aria-label="Your profile">
        <h1>{incomplete ? 'Finish your details' : 'Your details'}</h1>
        {incomplete && (
          <p className="profile-banner" role="status">
            Your board and class are needed before practice, mock tests and the tutor open. They
            decide which papers and questions you see.
          </p>
        )}
        <ProfileForm
          classLevel={user.classLevel ?? null}
          email={user.email}
          incomplete={incomplete}
          name={user.name}
          preferredLanguage={user.preferredLanguage ?? 'en'}
          board={user.board ?? ''}
          targetExamYear={user.targetExamYear ?? null}
        />
      </section>
    </StudyShell>
  )
}
