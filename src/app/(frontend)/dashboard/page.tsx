import { redirect } from 'next/navigation'

import { StudentApp } from '@/components/study/StudentApp'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Dashboard · Markhall',
}

export default async function DashboardPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in desk if the database is unreachable.
  }

  if (!user) redirect('/login')

  return <StudentApp user={{ email: user.email, name: user.name }} />
}
