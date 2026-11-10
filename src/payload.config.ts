import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Subjects } from './collections/Subjects'
import { Chapters } from './collections/Chapters'
import { SourceDocuments } from './collections/SourceDocuments'
import { SourcePages } from './collections/SourcePages'
import { KnowledgeBase } from './collections/KnowledgeBase'
import { QuestionBank } from './collections/QuestionBank'
import { TopicMastery } from './collections/TopicMastery'
import { DoubtThreads } from './collections/DoubtThreads'
import { Attempts } from './collections/Attempts'
import { MockTests } from './collections/MockTests'
import { MockAttempts } from './collections/MockAttempts'
import { StudentUploads } from './collections/StudentUploads'
import { embedContent } from './jobs/embedContent'
import { ingestDocument } from './jobs/ingestDocument'
import { env } from './lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Subjects,
    Chapters,
    SourceDocuments,
    SourcePages,
    KnowledgeBase,
    QuestionBank,
    TopicMastery,
    DoubtThreads,
    Attempts,
    MockTests,
    MockAttempts,
    StudentUploads,
  ],
  editor: lexicalEditor(),
  secret: env.payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.databaseUrl,
    },
    // The pgvector sidecar table is not in Payload's schema, so a dev push would drop it.
    push: false,
  }),
  jobs: {
    autoRun: env.jobsAutoRun ? [{ allQueues: true, cron: '* * * * *' }] : undefined,
    tasks: [embedContent],
    workflows: [ingestDocument],
  },
  sharp,
  plugins: [],
})
