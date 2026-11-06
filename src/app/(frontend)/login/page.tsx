import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Wordmark } from '@/components/brand/Wordmark'
import { HairlinePlate } from '@/components/landing/HairlinePlate'
import { getCurrentUser } from '@/lib/auth'
import { AuthForm } from './AuthForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign in · Markhall',
  description: 'Sign in to your Markhall roll or create a student account.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // The form is still usable; the action reports a connection error if the database is down.
  }

  if (user) redirect('/dashboard')

  const { mode } = await searchParams
  const initialMode = mode === 'signup' ? 'signup' : 'signin'

  return (
    <main className="auth">
      <section className="auth-field">
        <Link className="auth-wordmark" href="/">
          <Wordmark tone="ink" />
        </Link>

        <div>
          <h1>Take your seat.</h1>
          <p className="auth-field-lede">
            Sign in to open your seating plan, resume a session, and see what the examiner wants next.
          </p>
        </div>

        <HairlinePlate tone="ink" />

        <p className="auth-field-note">Class 9–10 · All boards · Sample questions labelled</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <Link className="auth-back" href="/">
            Back to the hall
          </Link>
          <h2>Open your roll.</h2>
          <AuthForm initialMode={initialMode} />
          <p className="auth-legal">
            By continuing you agree that this is a study tool, not an official board or examination
            service. Sample questions and marks are labelled.
          </p>
        </div>
      </section>
    </main>
  )
}
