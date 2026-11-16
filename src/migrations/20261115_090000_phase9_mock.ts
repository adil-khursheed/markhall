import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_mock_attempts_answers_grading_status" ADD VALUE 'needs_review';
    ALTER TABLE "mock_attempts" ADD COLUMN "review_requested" boolean DEFAULT false;
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'buildMockTest';
    ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'gradeMockAttempt';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "mock_attempts" DROP COLUMN "review_requested";
    -- Enum values cannot be dropped without a type recreate; they stay unused.
  `)
}
