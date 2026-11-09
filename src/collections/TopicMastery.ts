import type { CollectionConfig } from 'payload'

import { loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'

export const TopicMastery: CollectionConfig = {
  slug: 'topic-mastery',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'chapter', 'attempts', 'correct', 'mastery', 'lastSeenAt'],
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
      required: true,
      index: true,
    },
    {
      name: 'attempts',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'correct',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'mastery',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 1,
    },
    {
      name: 'lastSeenAt',
      type: 'date',
    },
  ],
  indexes: [{ unique: true, fields: ['user', 'chapter'] }],
}
