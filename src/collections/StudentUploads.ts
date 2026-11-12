import type { CollectionConfig } from 'payload'

import { adminFieldOnly, loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'
import { maxUploadSize, stripExif } from '../hooks/uploads'
import { retentionDate } from '../lib/agent/vision'

export const StudentUploads: CollectionConfig = {
  slug: 'student-uploads',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'owner', 'purpose', 'kind', 'createdAt'],
    group: 'Learning',
  },
  access: {
    read: ownerOrAdmin('owner'),
    create: loggedIn,
    update: ownerOrAdmin('owner'),
    delete: ownerOrAdmin('owner'),
  },
  upload: {
    staticDir: 'uploads/student-uploads',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  hooks: {
    beforeValidate: [maxUploadSize(8 * 1024 * 1024), stripExif],
    beforeChange: [setOwner('owner')],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'purpose',
      type: 'select',
      required: true,
      options: [
        { label: 'Doubt', value: 'doubt' },
        { label: 'Mock answer', value: 'mock_answer' },
        { label: 'Profile', value: 'profile' },
      ],
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Read as',
      admin: { description: 'Filled by the vision transcription (Phase 7).' },
      options: [
        { label: 'Student solution', value: 'student_solution' },
        { label: 'Textbook question', value: 'textbook_question' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'thread',
      type: 'relationship',
      relationTo: 'doubt-threads',
    },
    {
      name: 'attempt',
      type: 'relationship',
      relationTo: 'mock-attempts',
    },
    {
      name: 'transcription',
      type: 'textarea',
    },
    {
      name: 'transcriptionConfidence',
      type: 'number',
      min: 0,
      max: 1,
    },
    {
      name: 'retentionUntil',
      type: 'date',
      admin: { position: 'sidebar' },
      hooks: {
        beforeChange: [({ value }) => value ?? retentionDate()],
      },
    },
  ],
}
