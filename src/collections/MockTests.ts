import type { CollectionConfig, Where } from 'payload'

import { adminFieldOnly, adminOnly } from '../access'
import { boardField, classLevelField, statusField } from '../fields/common'
import { requirePublishedQuestions } from '../hooks/publishGate'

export const MockTests: CollectionConfig = {
  slug: 'mock-tests',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'board', 'classLevel', 'subject', 'status', 'durationMinutes'],
    listSearchableFields: ['title'],
    group: 'Assessment',
    components: {
      listMenuItems: ['/components/admin/ReviewQueueLink'],
    },
  },
  access: {
    // Students see shared published papers and their own personal papers only.
    read: ({ req }): boolean | Where => {
      if (req.user?.role === 'admin') return true
      if (!req.user) return false
      return {
        and: [
          { status: { equals: 'published' } },
          {
            or: [{ generatedFor: { exists: false } }, { generatedFor: { equals: req.user.id } }],
          },
        ],
      }
    },
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [requirePublishedQuestions],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    boardField,
    classLevelField,
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      index: true,
    },
    {
      name: 'durationMinutes',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'totalMarks',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'negativeMarking',
      type: 'number',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'sections',
      type: 'array',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'instructions',
          type: 'textarea',
        },
        {
          name: 'questions',
          type: 'relationship',
          relationTo: 'question-bank',
          hasMany: true,
          required: true,
        },
        {
          name: 'marksEach',
          type: 'number',
          min: 1,
        },
      ],
    },
    {
      name: 'generatedFor',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'blueprintSnapshot',
      type: 'json',
    },
    statusField,
    {
      name: 'reviewNotes',
      type: 'textarea',
      access: {
        read: adminFieldOnly,
        update: adminFieldOnly,
      },
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
