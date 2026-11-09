import type { CollectionConfig } from 'payload'

import { adminFieldOnly, loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'

export const Attempts: CollectionConfig = {
  slug: 'attempts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'question', 'isCorrect', 'timeMs', 'createdAt'],
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
        update: adminFieldOnly,
      },
    },
    {
      name: 'question',
      type: 'relationship',
      relationTo: 'question-bank',
      required: true,
      index: true,
    },
    {
      name: 'answer',
      type: 'textarea',
    },
    {
      name: 'isCorrect',
      type: 'checkbox',
      access: {
        read: adminFieldOnly,
        update: adminFieldOnly,
      },
    },
    {
      name: 'timeMs',
      type: 'number',
      min: 0,
    },
  ],
}
