import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_student_uploads_kind" AS ENUM('student_solution', 'textbook_question', 'other');
    ALTER TABLE "student_uploads" ADD COLUMN "kind" "enum_student_uploads_kind";
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'purgeExpiredUploads';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "student_uploads" DROP COLUMN "kind";
    DROP TYPE "public"."enum_student_uploads_kind";
  `)
}
