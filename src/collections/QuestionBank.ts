import type { CollectionConfig } from 'payload'

import { adminFieldOnly, adminOnly, adminOrPublished } from '../access'
import { boardField, classLevelField, languageField, statusField } from '../fields/common'

export const QuestionBank: CollectionConfig = {
  slug: 'question-bank',
  admin: {
    useAsTitle: 'stem',
    defaultColumns: ['stem', 'type', 'board', 'classLevel', 'status', 'difficulty', 'origin'],
    listSearchableFields: ['stem'],
    group: 'Question bank',
    components: {
      listMenuItems: ['/components/admin/ReviewQueueLink'],
    },
  },
  access: {
    read: adminOrPublished,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'stem',
      type: 'textarea',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'mcq',
      options: [
        { label: 'Multiple choice', value: 'mcq' },
        { label: 'Short answer', value: 'short' },
        { label: 'Long answer', value: 'long' },
        { label: 'Numeric', value: 'numeric' },
      ],
    },
    {
      name: 'options',
      type: 'array',
      admin: {
        condition: (data) => data.type === 'mcq',
      },
      fields: [
        {
          name: 'label',
          type: 'select',
          required: true,
          options: ['A', 'B', 'C', 'D'].map((value) => ({ label: value, value })),
        },
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'marks',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Easy', value: 'easy' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hard', value: 'hard' },
      ],
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
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
      required: true,
      index: true,
    },
    languageField,
    {
      name: 'canonicalSolution',
      type: 'textarea',
      access: {
        read: adminFieldOnly,
      },
    },
    {
      name: 'finalAnswer',
      type: 'text',
      access: {
        read: adminFieldOnly,
      },
    },
    {
      name: 'verification',
      type: 'json',
      access: {
        read: adminFieldOnly,
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'origin',
      type: 'select',
      required: true,
      defaultValue: 'generated',
      options: [
        { label: 'Board PYQ', value: 'board_pyq' },
        { label: 'Textbook', value: 'textbook' },
        { label: 'Generated', value: 'generated' },
        { label: 'Teacher', value: 'teacher' },
      ],
    },
    {
      name: 'pyqYear',
      type: 'number',
      min: 2000,
      max: 2100,
      admin: {
        condition: (data) => data.origin === 'board_pyq',
      },
    },
    {
      name: 'sourceDocument',
      type: 'relationship',
      relationTo: 'source-documents',
    },
    statusField,
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      access: {
        read: adminFieldOnly,
        update: adminFieldOnly,
      },
    },
    {
      name: 'needsFigure',
      type: 'checkbox',
      defaultValue: false,
    },
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
