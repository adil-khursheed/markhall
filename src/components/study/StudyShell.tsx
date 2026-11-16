'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { AppShell } from '@/components/study/AppShell'

export function StudyShell({
  active,
  children,
  board,
  grade,
  coveragePercent,
  user,
}: {
  active: 'dashboard' | 'practice' | 'mock' | 'profile'
  children: ReactNode
  board: string
  grade: string
  coveragePercent?: number
  user: { email: string; name: string }
}) {
  const router = useRouter()
  return (
    <AppShell
      active={active}
      board={board}
      coveragePercent={coveragePercent}
      grade={grade}
      sessionActive={false}
      user={user}
      onDashboard={() => router.push('/dashboard')}
      onDoubts={() => router.push('/tutor')}
      onMock={() => router.push('/mock')}
      onProfile={() => router.push('/profile')}
      onPractice={active === 'practice' ? () => {} : () => router.push('/practice')}
    >
      {children}
    </AppShell>
  )
}
