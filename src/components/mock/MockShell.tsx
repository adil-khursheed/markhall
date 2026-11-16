'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { StudyShell } from '@/components/study/StudyShell'

export function MockShell({
  children,
  board,
  grade,
  user,
}: {
  children: ReactNode
  board: string
  grade: string
  user: { email: string; name: string }
}) {
  return (
    <StudyShell active="mock" board={board} grade={grade} user={user}>
      {children}
    </StudyShell>
  )
}

/** Small client buttons for actions posted to /api/mock. */
export function MockButton({
  action,
  attemptId,
  testId,
  label,
  busyLabel = 'Working…',
  className = 'button button-primary',
}: {
  action: 'start' | 'submit' | 'review'
  attemptId?: number
  testId?: number
  label: string
  busyLabel?: string
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/mock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, attemptId, testId }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok || data?.error) {
        setError(data?.error ?? 'That could not be completed. Try again.')
        setBusy(false)
        return
      }
      router.refresh()
    } catch {
      setError('That could not be completed. Try again.')
      setBusy(false)
    }
  }

  return (
    <span className="mock-action">
      <button className={className} disabled={busy} onClick={run} type="button">
        {busy ? busyLabel : label}
      </button>
      {error && <span className="mock-error-text">{error}</span>}
    </span>
  )
}
