import type { Payload } from 'payload'

import type { User } from '@/payload-types'
import { env } from '@/lib/env'

/**
 * Sum of output tokens a student's tutor runs have burned since UTC midnight.
 * The cap is checked before a run starts, so the worst case per student per
 * day is one run that exceeds the limit.
 */
export async function tokensUsedToday(payload: Payload, userId: number | string): Promise<number> {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  const rows = await payload
    .find({
      collection: 'agent-runs',
      where: {
        and: [{ user: { equals: userId } }, { createdAt: { greater_than: since.toISOString() } }],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })
    .catch(() => null)
  return (rows?.docs ?? []).reduce((sum, row) => sum + (row.tokensOut ?? 0), 0)
}

/** Returns the refusal message when the student is over their daily cap. */
export async function tokenBudgetMessage(
  payload: Payload,
  user: User,
): Promise<string | null> {
  if (user.role !== 'student') return null
  const used = await tokensUsedToday(payload, user.id)
  if (used < env.dailyTokenLimit) return null
  return 'You have reached today’s tutor limit. Come back tomorrow.'
}
