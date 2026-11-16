import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_agent_runs_status" AS ENUM('done', 'error', 'cancelled');

    CREATE TABLE "agent_runs" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "thread_id" integer,
      "status" "enum_agent_runs_status" DEFAULT 'done' NOT NULL,
      "question" text,
      "tokens_in" numeric,
      "tokens_out" numeric,
      "latency_ms" numeric,
      "error" text,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_thread_id_doubt_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."doubt_threads"("id") ON DELETE set null ON UPDATE no action;

    CREATE INDEX "agent_runs_user_idx" ON "agent_runs" USING btree ("user_id");
    CREATE INDEX "agent_runs_thread_idx" ON "agent_runs" USING btree ("thread_id");
    CREATE INDEX "agent_runs_created_at_idx" ON "agent_runs" USING btree ("created_at");

    CREATE TABLE "verified_answers" (
      "id" serial PRIMARY KEY NOT NULL,
      "hash" varchar NOT NULL,
      "chapter_id" integer,
      "language" varchar,
      "question" text NOT NULL,
      "answer" text NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    ALTER TABLE "verified_answers" ADD CONSTRAINT "verified_answers_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;

    CREATE UNIQUE INDEX "verified_answers_hash_idx" ON "verified_answers" USING btree ("hash");
    CREATE INDEX "verified_answers_chapter_idx" ON "verified_answers" USING btree ("chapter_id");
    CREATE INDEX "verified_answers_updated_at_idx" ON "verified_answers" USING btree ("updated_at");
    CREATE INDEX "verified_answers_created_at_idx" ON "verified_answers" USING btree ("created_at");

    -- Payload locks documents through this table; every collection needs a rel column.
    -- Runs last: the FKs reference the tables created above.
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_runs_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "verified_answers_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_runs_fk" FOREIGN KEY ("agent_runs_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_verified_answers_fk" FOREIGN KEY ("verified_answers_id") REFERENCES "public"."verified_answers"("id") ON DELETE cascade ON UPDATE no action;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_verified_answers_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_runs_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "verified_answers_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_runs_id";
    DROP TABLE "verified_answers";
    DROP TABLE "agent_runs";
    DROP TYPE "public"."enum_agent_runs_status";
  `)
}
