import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { adminFieldOnly, adminOnly } from '../access'

const assignFirstUserAsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    overrideAccess: true,
  })

  if (totalDocs === 0) {
    data.role = 'admin'
  } else if (req.context?.publicSignup) {
    data.role = 'student'
  }

  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role', 'board', 'classLevel'],
    group: 'People',
  },
  auth: true,
  access: {
    admin: ({ req }) => req.user?.role === 'admin',
    create: adminOnly,
    delete: adminOnly,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeChange: [assignFirstUserAsAdmin],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Shown on the roll call and in the dashboard top bar.',
      },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      saveToJWT: true,
      options: [
        { label: 'Student', value: 'student' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        create: adminFieldOnly,
        update: adminFieldOnly,
      },
    },
    {
      name: 'board',
      type: 'select',
      options: [
        { label: 'CBSE', value: 'cbse' },
        { label: 'ICSE', value: 'icse' },
        { label: 'UP Board', value: 'up' },
      ],
    },
    {
      name: 'classLevel',
      type: 'number',
      min: 6,
      max: 12,
    },
    {
      name: 'preferredLanguage',
      type: 'select',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'Hindi', value: 'hi' },
      ],
    },
  ],
}
