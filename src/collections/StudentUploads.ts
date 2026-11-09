import type { CollectionConfig } from 'payload'

import { adminFieldOnly, loggedIn, ownerOrAdmin } from '../access'
import { setOwner } from '../hooks/ownership'
import { maxUploadSize, stripExif } from '../hooks/uploads'

export const StudentUploads: CollectionConfig = {
  slug: 'student-uploads',
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'owner', 'purpose', 'createdAt'],
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
    },
  ],
}
