import type { TaskConfig } from 'payload'

import { planQuestions } from '@/lib/generate/plan'
import { generateOne } from '@/lib/generate/worker'

const BATCH = 4 // the sandbox runs 2 workers with an 8-slot queue

export const generateQuestions: TaskConfig<'generateQuestions'> = {
  slug: 'generateQuestions',
  inputSchema: [
    { name: 'subjectId', type: 'number', required: true },
    { name: 'chapterId', type: 'number' },
    { name: 'count', type: 'number', required: true },
  ],
  retries: 1,
  handler: async ({ input, req }) => {
    const user = req.user
    if (!user || user.role !== 'admin') {
      throw new Error('Only admins can generate questions.')
    }

    const specs = await planQuestions({
      payload: req.payload,
      user,
      subjectId: input.subjectId,
      chapterId: input.chapterId ?? undefined,
      count: input.count,
    })

    const results: ({ ok: true; id: number } | { ok: false; errors: string[] })[] = []
    for (let start = 0; start < specs.length; start += BATCH) {
      const batch = specs.slice(start, start + BATCH)
      results.push(
        ...await Promise.all(
          batch.map((spec) => generateOne({ payload: req.payload, user, spec, subjectId: input.subjectId })),
        ),
      )
    }

    const saved = results.filter((result) => result.ok).length
    const failures = results.flatMap((result, index) =>
      result.ok ? [] : [`Spec ${index + 1} (${specs[index].concept}): ${result.errors.join('; ')}`],
    )

    return { output: { planned: specs.length, saved, failures } }
  },
}
