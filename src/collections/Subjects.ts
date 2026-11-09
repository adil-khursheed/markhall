import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'
import { boardField, classLevelField } from '../fields/common'

export const Subjects: CollectionConfig = {
  slug: 'subjects',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'board', 'classLevel', 'code', 'academicYear'],
    group: 'Curriculum',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    boardField,
    classLevelField,
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'code',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'academicYear',
      type: 'text',
      required: true,
      defaultValue: '2025-26',
    },
  ],
  indexes: [{ unique: true, fields: ['board', 'classLevel', 'code'] }],
}
