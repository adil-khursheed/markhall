import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'users' })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
