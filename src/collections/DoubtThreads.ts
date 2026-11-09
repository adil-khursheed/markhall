import type { CollectionConfig } from 'payload'

import { loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'

export const DoubtThreads: CollectionConfig = {
  slug: 'doubt-threads',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'chapter', 'flagged', 'updatedAt'],
    group: 'Learning',
  },
  access: {
    read: ownerOrAdmin('user'),
    create: loggedIn,
    update: ownerOrAdmin('user'),
    delete: ownerOrAdmin('user'),
  },
  hooks: {
    beforeChange: [setOwner('user')],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: {
        update: ({ req }) => req.user?.role === 'admin',
      },
    },
    {
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
    },
    {
      name: 'messages',
      type: 'array',
      fields: [
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            { label: 'Student', value: 'user' },
            { label: 'Tutor', value: 'assistant' },
          ],
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
        {
          name: 'at',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'flagged',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
  ],
}
