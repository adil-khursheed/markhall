import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "content_embeddings" SET "status" = 'published'
      WHERE "source_type" = 'knowledge' AND "status" IS NULL;
    CREATE INDEX IF NOT EXISTS "content_embeddings_hnsw" ON "content_embeddings"
      USING hnsw ("embedding" vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "content_embeddings_hnsw";`)
}
