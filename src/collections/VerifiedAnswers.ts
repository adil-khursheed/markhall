import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'

/**
 * Doubt answers that passed validation are cached here by the normalised
 * question, chapter and language (see src/lib/agent/cache.ts), so repeats
 * skip the full graph run.
 */
export const VerifiedAnswers: CollectionConfig = {
  slug: 'verified-answers',
  admin: {
    useAsTitle: 'hash',
    defaultColumns: ['hash', 'chapter', 'language', 'question', 'updatedAt'],
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
      name: 'hash',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
    },
    {
      name: 'language',
      type: 'text',
      maxLength: 16,
    },
    {
      name: 'question',
      type: 'textarea',
      required: true,
    },
    {
      name: 'answer',
      type: 'textarea',
      required: true,
    },
  ],
  indexes: [{ unique: true, fields: ['hash'] }],
}
