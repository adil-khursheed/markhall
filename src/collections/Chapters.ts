import type { CollectionConfig } from 'payload'

import { adminOnly } from '../access'

export const Chapters: CollectionConfig = {
  slug: 'chapters',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'subject', 'number', 'weightageMarks'],
    group: 'Curriculum',
    components: {
      edit: {
        editMenuItems: ['/components/admin/GenerateButton'],
      },
    },
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  endpoints: [
    {
      path: '/:id/generate',
      method: 'post',
      handler: async (req) => {
        if (req.user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const id = req.routeParams?.id
        if (typeof id !== 'string' && typeof id !== 'number') {
          return Response.json({ error: 'Missing chapter id' }, { status: 400 })
        }

        const chapter = await req.payload.findByID({
          collection: 'chapters',
          id,
          depth: 0,
          overrideAccess: true,
        })
        const subjectId =
          typeof chapter.subject === 'object' ? chapter.subject.id : chapter.subject
        const count = Number(req.query?.count ?? 5)

        try {
          await req.payload.jobs.queue({
            task: 'generateQuestions',
            input: { subjectId, chapterId: chapter.id, count },
            req,
          })
        } catch {
          return Response.json({ error: 'Could not queue generation.' }, { status: 500 })
        }

        return Response.json({ ok: true, queued: count })
      },
    },
  ],
  fields: [
    {
      name: 'subject',
      type: 'relationship',
      relationTo: 'subjects',
      required: true,
      index: true,
    },
    {
      name: 'number',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'weightageMarks',
      type: 'number',
      min: 0,
    },
  ],
  indexes: [{ unique: true, fields: ['subject', 'number'] }],
}
