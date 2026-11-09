import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'
import { boardField, classLevelField, languageField } from '../fields/common'

export const KnowledgeBase: CollectionConfig = {
  slug: 'knowledge-base',
  admin: {
    useAsTitle: 'content',
    defaultColumns: ['kind', 'chapter', 'board', 'classLevel', 'language'],
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
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Concept', value: 'concept' },
        { label: 'Formula', value: 'formula' },
        { label: 'Example', value: 'example' },
        { label: 'Definition', value: 'definition' },
      ],
    },
    {
      name: 'chapter',
      type: 'relationship',
      relationTo: 'chapters',
      required: true,
      index: true,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'blueprint',
      type: 'json',
    },
    {
      name: 'pageRange',
      type: 'text',
    },
    {
      name: 'contentHash',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
      },
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
    languageField,
  ],
}
