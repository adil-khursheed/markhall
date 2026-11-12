import 'katex/dist/katex.min.css'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

import { TutorDesk } from '@/components/tutor/TutorDesk'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ask a doubt · Markhall',
}

function threadPreview(content: string) {
  return content.length > 64 ? `${content.slice(0, 64)}…` : content
}

export default async function TutorPage() {
  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    // Fall through to the sign-in desk if the database is unreachable.
  }

  if (!user) redirect('/login')

  const payload = await getPayload({ config })
  const { docs } = await payload
    .find({
      collection: 'doubt-threads',
      user,
      overrideAccess: false,
      sort: '-updatedAt',
      limit: 20,
      depth: 0,
    })
    .catch(() => ({ docs: [] }))

  return (
    <TutorDesk
      threads={docs.map((thread) => ({
        id: thread.id,
        preview: threadPreview(
          thread.messages?.find((message) => message.role === 'user')?.content ?? `Doubt ${thread.id}`,
        ),
      }))}
      user={{
        board: user.board ?? undefined,
        classLevel: user.classLevel ?? undefined,
        email: user.email,
        name: user.name,
      }}
    />
  )
}
