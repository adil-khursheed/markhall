import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'

export const Chapters: CollectionConfig = {
  slug: 'chapters',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'number', 'weightageMarks'],
    group: 'Curriculum',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      index: true,
    },
    {
      name: 'number',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'weightageMarks',
      type: 'number',
      min: 0,
    },
  ],
  indexes: [{ unique: true, fields: ['subject', 'number'] }],
}
