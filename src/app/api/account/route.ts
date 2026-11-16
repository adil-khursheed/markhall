import { getPayload, type CollectionSlug } from 'payload'
import config from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OWNED: { collection: CollectionSlug; userField: string }[] = [
  { collection: 'doubt-threads', userField: 'user' },
  { collection: 'attempts', userField: 'user' },
  { collection: 'topic-mastery', userField: 'user' },
  { collection: 'mock-attempts', userField: 'user' },
  { collection: 'agent-runs', userField: 'user' },
  { collection: 'student-uploads', userField: 'owner' },
]

/** GET: download every record the signed-in student owns as one JSON file. */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    profile: {
      name: user.name,
      email: user.email,
      board: user.board,
      classLevel: user.classLevel,
      preferredLanguage: user.preferredLanguage,
    },
  }

  for (const { collection, userField } of OWNED) {
    const rows = await payload
      .find({
        collection,
        where: { [userField]: { equals: user.id } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    data[collection] = rows?.docs ?? []
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="markhall-data-${user.id}.json"`,
    },
  })
}

/** DELETE: erase the signed-in account and every record it owns. */
export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { confirm?: boolean } | null
  if (!body?.confirm) {
    return Response.json({ error: 'Send { confirm: true } to delete your account.' }, { status: 400 })
  }

  for (const { collection, userField } of OWNED) {
    const rows = await payload
      .find({
        collection,
        where: { [userField]: { equals: user.id } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)
    for (const row of rows?.docs ?? []) {
      await payload
        .delete({ collection, id: row.id, overrideAccess: true })
        .catch(() => null)
    }
  }
  // Personal mock papers generated for this student; shared tests stay.
  const personalTests = await payload
    .find({
      collection: 'mock-tests',
      where: { generatedFor: { equals: user.id } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  for (const test of personalTests?.docs ?? []) {
    await payload.delete({ collection: 'mock-tests', id: test.id, overrideAccess: true }).catch(() => null)
  }

  await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })

  return Response.json({ ok: true })
}
