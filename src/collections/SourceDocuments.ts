import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'
import { boardField, classLevelField, languageField } from '../fields/common'
import { rejectDuplicateSourceDocument, sourceDocumentHash } from '../hooks/sourceDocuments'

export const SourceDocuments: CollectionConfig = {
  slug: 'source-documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'docType', 'board', 'classLevel', 'ingestStatus', 'createdAt'],
    group: 'Ingestion',
    components: {
      edit: {
        editMenuItems: ['/components/admin/ReingestButton'],
      },
    },
  },
  endpoints: [
    {
      path: '/:id/reingest',
      method: 'post',
      handler: async (req) => {
        if (req.user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const id = req.routeParams?.id
        if (typeof id !== 'string' && typeof id !== 'number') {
          return Response.json({ error: 'Missing document id' }, { status: 400 })
        }

        try {
          const doc = await req.payload.update({
            collection: 'source-documents',
            id,
            data: { ingestStatus: 'pending', ingestError: null },
            overrideAccess: true,
          })

          return Response.json({ ok: true, ingestStatus: doc.ingestStatus })
        } catch {
          return Response.json({ error: 'Document not found' }, { status: 404 })
        }
      },
    },
  ],
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    staticDir: 'uploads/source-documents',
    mimeTypes: ['application/pdf'],
  },
  hooks: {
    beforeValidate: [sourceDocumentHash],
    beforeChange: [rejectDuplicateSourceDocument],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'docType',
      type: 'select',
      required: true,
      options: [
        { label: 'Textbook', value: 'textbook' },
        { label: 'Syllabus', value: 'syllabus' },
        { label: 'Previous year paper', value: 'pyq' },
        { label: 'Marking scheme', value: 'marking_scheme' },
        { label: 'Other', value: 'other' },
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
      name: 'year',
      type: 'number',
      min: 2000,
      max: 2100,
    },
    languageField,
    {
      name: 'ingestStatus',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Ready', value: 'ready' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'fileHash',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'ingestError',
      type: 'textarea',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
