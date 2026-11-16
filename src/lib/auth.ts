import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { User } from '@/payload-types'

export async function getCurrentUser() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user
}

/**
 * Students must set board and class before using the desk; the profile page
 * is the mandatory onboarding form. Admins manage content and skip it.
 */
export function requireCompleteProfile(user: User) {
  if (user.role === 'student' && (!user.board || user.classLevel == null)) {
    redirect('/profile')
  }
}
