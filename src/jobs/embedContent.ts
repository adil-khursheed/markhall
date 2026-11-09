import type { TaskConfig } from 'payload'

import { embedContent as embedOne } from '@/lib/ingest/embed'

export const embedContent: TaskConfig<'embedContent'> = {
  slug: 'embedContent',
  inputSchema: [
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      options: [
        { label: 'Knowledge base', value: 'knowledge' },
        { label: 'Question bank', value: 'question' },
      ],
    },
    { name: 'sourceId', type: 'number', required: true },
  ],
  retries: 3,
  handler: async ({ input, req }) => {
    const result = await embedOne(req.payload, input.sourceType, input.sourceId)
    return { output: result }
  },
}
