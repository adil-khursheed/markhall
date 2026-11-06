import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function getCurrentUser() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user
}
