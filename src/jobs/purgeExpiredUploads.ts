import type { TaskConfig } from 'payload'

/**
 * Deletes student uploads whose retentionUntil date has passed, then re-queues
 * itself for the next day. Registered in payload.config with an onInit queue so
 * the first run is scheduled without an external scheduler.
 */
export const purgeExpiredUploads: TaskConfig<'purgeExpiredUploads'> = {
  slug: 'purgeExpiredUploads',
  inputSchema: [],
  retries: 3,
  handler: async ({ req }) => {
    const { payload } = req

    const result = await payload.delete({
      collection: 'student-uploads',
      where: { retentionUntil: { less_than: new Date().toISOString() } },
      overrideAccess: true,
      depth: 0,
    })

    const deleted = Array.isArray(result.docs) ? result.docs.length : 0
    const waitUntil = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await payload.jobs.queue({ task: 'purgeExpiredUploads', input: {}, waitUntil })

    return { output: { deleted, nextRunAt: waitUntil.toISOString() } }
  },
}
