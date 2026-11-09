import type { CollectionConfig } from 'payload'

import { adminFieldOnly, loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'

export const MockAttempts: CollectionConfig = {
  slug: 'mock-attempts',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'test', 'status', 'totalScore', 'submittedAt'],
    group: 'Assessment',
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
      name: 'test',
      type: 'relationship',
      relationTo: 'mock-tests',
      required: true,
      index: true,
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'deadlineAt',
      type: 'date',
    },
    {
      name: 'submittedAt',
      type: 'date',
    },
    {
      name: 'answers',
      type: 'array',
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'question-bank',
          required: true,
        },
        {
          name: 'response',
          type: 'textarea',
        },
        {
          name: 'images',
          type: 'relationship',
          relationTo: 'student-uploads',
          hasMany: true,
        },
        {
          name: 'autoScore',
          type: 'number',
          access: {
            update: adminFieldOnly,
          },
        },
        {
          name: 'aiScore',
          type: 'number',
          access: {
            update: adminFieldOnly,
          },
        },
        {
          name: 'finalScore',
          type: 'number',
          access: {
            update: adminFieldOnly,
          },
        },
        {
          name: 'feedback',
          type: 'textarea',
          access: {
            update: adminFieldOnly,
          },
        },
        {
          name: 'gradingStatus',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Graded', value: 'graded' },
          ],
          access: {
            update: adminFieldOnly,
          },
        },
      ],
    },
    {
      name: 'totalScore',
      type: 'number',
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'in_progress',
      index: true,
      options: [
        { label: 'In progress', value: 'in_progress' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Graded', value: 'graded' },
        { label: 'Expired', value: 'expired' },
      ],
    },
  ],
}
