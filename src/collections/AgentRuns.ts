import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'

/**
 * One row per tutor run: latency, token use and failure reason. This is the
 * admin's window into cost and errors — no external tracing service.
 */
export const AgentRuns: CollectionConfig = {
  slug: 'agent-runs',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'status', 'tokensIn', 'tokensOut', 'latencyMs', 'error', 'createdAt'],
    group: 'Operations',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'thread',
      type: 'relationship',
      relationTo: 'doubt-threads',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'done',
      options: [
        { label: 'Done', value: 'done' },
        { label: 'Error', value: 'error' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'question',
      type: 'textarea',
      // First 2000 chars only: runs are for auditing, not full history.
      maxLength: 2000,
    },
    {
      name: 'tokensIn',
      type: 'number',
      min: 0,
    },
    {
      name: 'tokensOut',
      type: 'number',
      min: 0,
    },
    {
      name: 'latencyMs',
      type: 'number',
      min: 0,
    },
    {
      name: 'error',
      type: 'textarea',
      maxLength: 2000,
    },
  ],
}
