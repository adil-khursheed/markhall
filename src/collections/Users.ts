import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    admin: async ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true

      const { totalDocs } = await req.payload.count({ collection: 'users' })
      return totalDocs === 1
    },
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
      options: [
        { label: 'Student', value: 'student' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        create: ({ req: { user } }) => user?.role === 'admin',
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
