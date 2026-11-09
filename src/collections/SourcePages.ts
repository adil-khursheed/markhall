import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'

export const SourcePages: CollectionConfig = {
  slug: 'source-pages',
  admin: {
    useAsTitle: 'pageNumber',
    defaultColumns: ['document', 'pageNumber'],
    group: 'Ingestion',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'document',
      type: 'relationship',
      relationTo: 'source-documents',
      required: true,
      index: true,
    },
    {
      name: 'pageNumber',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'text',
      type: 'textarea',
      required: true,
    },
  ],
  indexes: [{ unique: true, fields: ['document', 'pageNumber'] }],
}
