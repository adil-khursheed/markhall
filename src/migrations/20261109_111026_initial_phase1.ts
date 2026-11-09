import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('student', 'admin');
  CREATE TYPE "public"."enum_users_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_users_preferred_language" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_subjects_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_source_documents_doc_type" AS ENUM('textbook', 'syllabus', 'pyq', 'marking_scheme', 'other');
  CREATE TYPE "public"."enum_source_documents_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_source_documents_language" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_source_documents_ingest_status" AS ENUM('pending', 'processing', 'ready', 'failed');
  CREATE TYPE "public"."enum_knowledge_base_kind" AS ENUM('concept', 'formula', 'example', 'definition');
  CREATE TYPE "public"."enum_knowledge_base_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_knowledge_base_language" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_question_bank_options_label" AS ENUM('A', 'B', 'C', 'D');
  CREATE TYPE "public"."enum_question_bank_type" AS ENUM('mcq', 'short', 'long', 'numeric');
  CREATE TYPE "public"."enum_question_bank_difficulty" AS ENUM('easy', 'medium', 'hard');
  CREATE TYPE "public"."enum_question_bank_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_question_bank_language" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_question_bank_origin" AS ENUM('board_pyq', 'textbook', 'generated', 'teacher');
  CREATE TYPE "public"."enum_question_bank_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_doubt_threads_messages_role" AS ENUM('user', 'assistant');
  CREATE TYPE "public"."enum_mock_tests_board" AS ENUM('cbse', 'icse', 'up');
  CREATE TYPE "public"."enum_mock_tests_status" AS ENUM('draft', 'in_review', 'published', 'rejected');
  CREATE TYPE "public"."enum_mock_attempts_answers_grading_status" AS ENUM('pending', 'graded');
  CREATE TYPE "public"."enum_mock_attempts_status" AS ENUM('in_progress', 'submitted', 'graded', 'expired');
  CREATE TYPE "public"."enum_student_uploads_purpose" AS ENUM('doubt', 'mock_answer', 'profile');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'student' NOT NULL,
  	"board" "enum_users_board",
  	"class_level" numeric,
  	"preferred_language" "enum_users_preferred_language" DEFAULT 'en',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "subjects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"board" "enum_subjects_board" NOT NULL,
  	"class_level" numeric NOT NULL,
  	"name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"academic_year" varchar DEFAULT '2025-26' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject_id" integer NOT NULL,
  	"number" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"weightage_marks" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "source_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"doc_type" "enum_source_documents_doc_type" NOT NULL,
  	"board" "enum_source_documents_board" NOT NULL,
  	"class_level" numeric NOT NULL,
  	"subject_id" integer NOT NULL,
  	"year" numeric,
  	"language" "enum_source_documents_language" DEFAULT 'en',
  	"ingest_status" "enum_source_documents_ingest_status" DEFAULT 'pending',
  	"file_hash" varchar,
  	"ingest_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "source_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"document_id" integer NOT NULL,
  	"page_number" numeric NOT NULL,
  	"text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "knowledge_base" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_knowledge_base_kind" NOT NULL,
  	"chapter_id" integer NOT NULL,
  	"content" varchar NOT NULL,
  	"blueprint" jsonb,
  	"page_range" varchar,
  	"content_hash" varchar,
  	"board" "enum_knowledge_base_board" NOT NULL,
  	"class_level" numeric NOT NULL,
  	"subject_id" integer NOT NULL,
  	"language" "enum_knowledge_base_language" DEFAULT 'en',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "question_bank_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" "enum_question_bank_options_label",
  	"text" varchar
  );
  
  CREATE TABLE "question_bank" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stem" varchar NOT NULL,
  	"type" "enum_question_bank_type" DEFAULT 'mcq' NOT NULL,
  	"marks" numeric NOT NULL,
  	"difficulty" "enum_question_bank_difficulty" DEFAULT 'medium' NOT NULL,
  	"board" "enum_question_bank_board" NOT NULL,
  	"class_level" numeric NOT NULL,
  	"subject_id" integer NOT NULL,
  	"chapter_id" integer NOT NULL,
  	"language" "enum_question_bank_language" DEFAULT 'en',
  	"canonical_solution" varchar,
  	"final_answer" varchar,
  	"verification" jsonb,
  	"origin" "enum_question_bank_origin" DEFAULT 'generated' NOT NULL,
  	"pyq_year" numeric,
  	"source_document_id" integer,
  	"status" "enum_question_bank_status" DEFAULT 'draft',
  	"reviewed_by_id" integer,
  	"needs_figure" boolean DEFAULT false,
  	"review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "topic_mastery" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"chapter_id" integer NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"correct" numeric DEFAULT 0,
  	"mastery" numeric DEFAULT 0,
  	"last_seen_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "doubt_threads_messages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_doubt_threads_messages_role" NOT NULL,
  	"content" varchar NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "doubt_threads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"chapter_id" integer,
  	"flagged" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"question_id" integer NOT NULL,
  	"answer" varchar,
  	"is_correct" boolean,
  	"time_ms" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mock_tests_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"instructions" varchar,
  	"marks_each" numeric
  );
  
  CREATE TABLE "mock_tests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"board" "enum_mock_tests_board" NOT NULL,
  	"class_level" numeric NOT NULL,
  	"subject_id" integer NOT NULL,
  	"duration_minutes" numeric NOT NULL,
  	"total_marks" numeric NOT NULL,
  	"negative_marking" numeric DEFAULT 0,
  	"generated_for_id" integer,
  	"blueprint_snapshot" jsonb,
  	"status" "enum_mock_tests_status" DEFAULT 'draft',
  	"review_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mock_tests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"question_bank_id" integer
  );
  
  CREATE TABLE "mock_attempts_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id" integer NOT NULL,
  	"response" varchar,
  	"auto_score" numeric,
  	"ai_score" numeric,
  	"final_score" numeric,
  	"feedback" varchar,
  	"grading_status" "enum_mock_attempts_answers_grading_status" DEFAULT 'pending'
  );
  
  CREATE TABLE "mock_attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"test_id" integer NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"deadline_at" timestamp(3) with time zone,
  	"submitted_at" timestamp(3) with time zone,
  	"total_score" numeric,
  	"status" "enum_mock_attempts_status" DEFAULT 'in_progress',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "mock_attempts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"student_uploads_id" integer
  );
  
  CREATE TABLE "student_uploads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"purpose" "enum_student_uploads_purpose" NOT NULL,
  	"thread_id" integer,
  	"attempt_id" integer,
  	"transcription" varchar,
  	"transcription_confidence" numeric,
  	"retention_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"subjects_id" integer,
  	"chapters_id" integer,
  	"source_documents_id" integer,
  	"source_pages_id" integer,
  	"knowledge_base_id" integer,
  	"question_bank_id" integer,
  	"topic_mastery_id" integer,
  	"doubt_threads_id" integer,
  	"attempts_id" integer,
  	"mock_tests_id" integer,
  	"mock_attempts_id" integer,
  	"student_uploads_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "source_pages" ADD CONSTRAINT "source_pages_document_id_source_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "question_bank_options" ADD CONSTRAINT "question_bank_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topic_mastery" ADD CONSTRAINT "topic_mastery_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doubt_threads_messages" ADD CONSTRAINT "doubt_threads_messages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doubt_threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doubt_threads" ADD CONSTRAINT "doubt_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doubt_threads" ADD CONSTRAINT "doubt_threads_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_tests_sections" ADD CONSTRAINT "mock_tests_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_tests" ADD CONSTRAINT "mock_tests_generated_for_id_users_id_fk" FOREIGN KEY ("generated_for_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_tests_rels" ADD CONSTRAINT "mock_tests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mock_tests_rels" ADD CONSTRAINT "mock_tests_rels_question_bank_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mock_attempts_answers" ADD CONSTRAINT "mock_attempts_answers_question_id_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_attempts_answers" ADD CONSTRAINT "mock_attempts_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."mock_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_test_id_mock_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."mock_tests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "mock_attempts_rels" ADD CONSTRAINT "mock_attempts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."mock_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "mock_attempts_rels" ADD CONSTRAINT "mock_attempts_rels_student_uploads_fk" FOREIGN KEY ("student_uploads_id") REFERENCES "public"."student_uploads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "student_uploads" ADD CONSTRAINT "student_uploads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_uploads" ADD CONSTRAINT "student_uploads_thread_id_doubt_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."doubt_threads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "student_uploads" ADD CONSTRAINT "student_uploads_attempt_id_mock_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."mock_attempts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subjects_fk" FOREIGN KEY ("subjects_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chapters_fk" FOREIGN KEY ("chapters_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_documents_fk" FOREIGN KEY ("source_documents_id") REFERENCES "public"."source_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_source_pages_fk" FOREIGN KEY ("source_pages_id") REFERENCES "public"."source_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_knowledge_base_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_question_bank_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topic_mastery_fk" FOREIGN KEY ("topic_mastery_id") REFERENCES "public"."topic_mastery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_doubt_threads_fk" FOREIGN KEY ("doubt_threads_id") REFERENCES "public"."doubt_threads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_attempts_fk" FOREIGN KEY ("attempts_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mock_tests_fk" FOREIGN KEY ("mock_tests_id") REFERENCES "public"."mock_tests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mock_attempts_fk" FOREIGN KEY ("mock_attempts_id") REFERENCES "public"."mock_attempts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_student_uploads_fk" FOREIGN KEY ("student_uploads_id") REFERENCES "public"."student_uploads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "subjects_board_idx" ON "subjects" USING btree ("board");
  CREATE INDEX "subjects_class_level_idx" ON "subjects" USING btree ("class_level");
  CREATE INDEX "subjects_name_idx" ON "subjects" USING btree ("name");
  CREATE INDEX "subjects_code_idx" ON "subjects" USING btree ("code");
  CREATE INDEX "subjects_updated_at_idx" ON "subjects" USING btree ("updated_at");
  CREATE INDEX "subjects_created_at_idx" ON "subjects" USING btree ("created_at");
  CREATE UNIQUE INDEX "board_classLevel_code_idx" ON "subjects" USING btree ("board","class_level","code");
  CREATE INDEX "chapters_subject_idx" ON "chapters" USING btree ("subject_id");
  CREATE INDEX "chapters_title_idx" ON "chapters" USING btree ("title");
  CREATE INDEX "chapters_updated_at_idx" ON "chapters" USING btree ("updated_at");
  CREATE INDEX "chapters_created_at_idx" ON "chapters" USING btree ("created_at");
  CREATE UNIQUE INDEX "subject_number_idx" ON "chapters" USING btree ("subject_id","number");
  CREATE INDEX "source_documents_title_idx" ON "source_documents" USING btree ("title");
  CREATE INDEX "source_documents_board_idx" ON "source_documents" USING btree ("board");
  CREATE INDEX "source_documents_class_level_idx" ON "source_documents" USING btree ("class_level");
  CREATE INDEX "source_documents_subject_idx" ON "source_documents" USING btree ("subject_id");
  CREATE INDEX "source_documents_ingest_status_idx" ON "source_documents" USING btree ("ingest_status");
  CREATE INDEX "source_documents_file_hash_idx" ON "source_documents" USING btree ("file_hash");
  CREATE INDEX "source_documents_updated_at_idx" ON "source_documents" USING btree ("updated_at");
  CREATE INDEX "source_documents_created_at_idx" ON "source_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "source_documents_filename_idx" ON "source_documents" USING btree ("filename");
  CREATE INDEX "source_pages_document_idx" ON "source_pages" USING btree ("document_id");
  CREATE INDEX "source_pages_updated_at_idx" ON "source_pages" USING btree ("updated_at");
  CREATE INDEX "source_pages_created_at_idx" ON "source_pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "document_pageNumber_idx" ON "source_pages" USING btree ("document_id","page_number");
  CREATE INDEX "knowledge_base_chapter_idx" ON "knowledge_base" USING btree ("chapter_id");
  CREATE INDEX "knowledge_base_content_hash_idx" ON "knowledge_base" USING btree ("content_hash");
  CREATE INDEX "knowledge_base_board_idx" ON "knowledge_base" USING btree ("board");
  CREATE INDEX "knowledge_base_class_level_idx" ON "knowledge_base" USING btree ("class_level");
  CREATE INDEX "knowledge_base_subject_idx" ON "knowledge_base" USING btree ("subject_id");
  CREATE INDEX "knowledge_base_updated_at_idx" ON "knowledge_base" USING btree ("updated_at");
  CREATE INDEX "knowledge_base_created_at_idx" ON "knowledge_base" USING btree ("created_at");
  CREATE INDEX "question_bank_options_order_idx" ON "question_bank_options" USING btree ("_order");
  CREATE INDEX "question_bank_options_parent_id_idx" ON "question_bank_options" USING btree ("_parent_id");
  CREATE INDEX "question_bank_board_idx" ON "question_bank" USING btree ("board");
  CREATE INDEX "question_bank_class_level_idx" ON "question_bank" USING btree ("class_level");
  CREATE INDEX "question_bank_subject_idx" ON "question_bank" USING btree ("subject_id");
  CREATE INDEX "question_bank_chapter_idx" ON "question_bank" USING btree ("chapter_id");
  CREATE INDEX "question_bank_source_document_idx" ON "question_bank" USING btree ("source_document_id");
  CREATE INDEX "question_bank_status_idx" ON "question_bank" USING btree ("status");
  CREATE INDEX "question_bank_reviewed_by_idx" ON "question_bank" USING btree ("reviewed_by_id");
  CREATE INDEX "question_bank_updated_at_idx" ON "question_bank" USING btree ("updated_at");
  CREATE INDEX "question_bank_created_at_idx" ON "question_bank" USING btree ("created_at");
  CREATE INDEX "topic_mastery_user_idx" ON "topic_mastery" USING btree ("user_id");
  CREATE INDEX "topic_mastery_chapter_idx" ON "topic_mastery" USING btree ("chapter_id");
  CREATE INDEX "topic_mastery_updated_at_idx" ON "topic_mastery" USING btree ("updated_at");
  CREATE INDEX "topic_mastery_created_at_idx" ON "topic_mastery" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_chapter_idx" ON "topic_mastery" USING btree ("user_id","chapter_id");
  CREATE INDEX "doubt_threads_messages_order_idx" ON "doubt_threads_messages" USING btree ("_order");
  CREATE INDEX "doubt_threads_messages_parent_id_idx" ON "doubt_threads_messages" USING btree ("_parent_id");
  CREATE INDEX "doubt_threads_user_idx" ON "doubt_threads" USING btree ("user_id");
  CREATE INDEX "doubt_threads_chapter_idx" ON "doubt_threads" USING btree ("chapter_id");
  CREATE INDEX "doubt_threads_flagged_idx" ON "doubt_threads" USING btree ("flagged");
  CREATE INDEX "doubt_threads_updated_at_idx" ON "doubt_threads" USING btree ("updated_at");
  CREATE INDEX "doubt_threads_created_at_idx" ON "doubt_threads" USING btree ("created_at");
  CREATE INDEX "attempts_user_idx" ON "attempts" USING btree ("user_id");
  CREATE INDEX "attempts_question_idx" ON "attempts" USING btree ("question_id");
  CREATE INDEX "attempts_updated_at_idx" ON "attempts" USING btree ("updated_at");
  CREATE INDEX "attempts_created_at_idx" ON "attempts" USING btree ("created_at");
  CREATE INDEX "mock_tests_sections_order_idx" ON "mock_tests_sections" USING btree ("_order");
  CREATE INDEX "mock_tests_sections_parent_id_idx" ON "mock_tests_sections" USING btree ("_parent_id");
  CREATE INDEX "mock_tests_title_idx" ON "mock_tests" USING btree ("title");
  CREATE INDEX "mock_tests_board_idx" ON "mock_tests" USING btree ("board");
  CREATE INDEX "mock_tests_class_level_idx" ON "mock_tests" USING btree ("class_level");
  CREATE INDEX "mock_tests_subject_idx" ON "mock_tests" USING btree ("subject_id");
  CREATE INDEX "mock_tests_generated_for_idx" ON "mock_tests" USING btree ("generated_for_id");
  CREATE INDEX "mock_tests_status_idx" ON "mock_tests" USING btree ("status");
  CREATE INDEX "mock_tests_updated_at_idx" ON "mock_tests" USING btree ("updated_at");
  CREATE INDEX "mock_tests_created_at_idx" ON "mock_tests" USING btree ("created_at");
  CREATE INDEX "mock_tests_rels_order_idx" ON "mock_tests_rels" USING btree ("order");
  CREATE INDEX "mock_tests_rels_parent_idx" ON "mock_tests_rels" USING btree ("parent_id");
  CREATE INDEX "mock_tests_rels_path_idx" ON "mock_tests_rels" USING btree ("path");
  CREATE INDEX "mock_tests_rels_question_bank_id_idx" ON "mock_tests_rels" USING btree ("question_bank_id");
  CREATE INDEX "mock_attempts_answers_order_idx" ON "mock_attempts_answers" USING btree ("_order");
  CREATE INDEX "mock_attempts_answers_parent_id_idx" ON "mock_attempts_answers" USING btree ("_parent_id");
  CREATE INDEX "mock_attempts_answers_question_idx" ON "mock_attempts_answers" USING btree ("question_id");
  CREATE INDEX "mock_attempts_user_idx" ON "mock_attempts" USING btree ("user_id");
  CREATE INDEX "mock_attempts_test_idx" ON "mock_attempts" USING btree ("test_id");
  CREATE INDEX "mock_attempts_status_idx" ON "mock_attempts" USING btree ("status");
  CREATE INDEX "mock_attempts_updated_at_idx" ON "mock_attempts" USING btree ("updated_at");
  CREATE INDEX "mock_attempts_created_at_idx" ON "mock_attempts" USING btree ("created_at");
  CREATE INDEX "mock_attempts_rels_order_idx" ON "mock_attempts_rels" USING btree ("order");
  CREATE INDEX "mock_attempts_rels_parent_idx" ON "mock_attempts_rels" USING btree ("parent_id");
  CREATE INDEX "mock_attempts_rels_path_idx" ON "mock_attempts_rels" USING btree ("path");
  CREATE INDEX "mock_attempts_rels_student_uploads_id_idx" ON "mock_attempts_rels" USING btree ("student_uploads_id");
  CREATE INDEX "student_uploads_owner_idx" ON "student_uploads" USING btree ("owner_id");
  CREATE INDEX "student_uploads_thread_idx" ON "student_uploads" USING btree ("thread_id");
  CREATE INDEX "student_uploads_attempt_idx" ON "student_uploads" USING btree ("attempt_id");
  CREATE INDEX "student_uploads_updated_at_idx" ON "student_uploads" USING btree ("updated_at");
  CREATE INDEX "student_uploads_created_at_idx" ON "student_uploads" USING btree ("created_at");
  CREATE UNIQUE INDEX "student_uploads_filename_idx" ON "student_uploads" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_subjects_id_idx" ON "payload_locked_documents_rels" USING btree ("subjects_id");
  CREATE INDEX "payload_locked_documents_rels_chapters_id_idx" ON "payload_locked_documents_rels" USING btree ("chapters_id");
  CREATE INDEX "payload_locked_documents_rels_source_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("source_documents_id");
  CREATE INDEX "payload_locked_documents_rels_source_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("source_pages_id");
  CREATE INDEX "payload_locked_documents_rels_knowledge_base_id_idx" ON "payload_locked_documents_rels" USING btree ("knowledge_base_id");
  CREATE INDEX "payload_locked_documents_rels_question_bank_id_idx" ON "payload_locked_documents_rels" USING btree ("question_bank_id");
  CREATE INDEX "payload_locked_documents_rels_topic_mastery_id_idx" ON "payload_locked_documents_rels" USING btree ("topic_mastery_id");
  CREATE INDEX "payload_locked_documents_rels_doubt_threads_id_idx" ON "payload_locked_documents_rels" USING btree ("doubt_threads_id");
  CREATE INDEX "payload_locked_documents_rels_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("attempts_id");
  CREATE INDEX "payload_locked_documents_rels_mock_tests_id_idx" ON "payload_locked_documents_rels" USING btree ("mock_tests_id");
  CREATE INDEX "payload_locked_documents_rels_mock_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("mock_attempts_id");
  CREATE INDEX "payload_locked_documents_rels_student_uploads_id_idx" ON "payload_locked_documents_rels" USING btree ("student_uploads_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "subjects" CASCADE;
  DROP TABLE "chapters" CASCADE;
  DROP TABLE "source_documents" CASCADE;
  DROP TABLE "source_pages" CASCADE;
  DROP TABLE "knowledge_base" CASCADE;
  DROP TABLE "question_bank_options" CASCADE;
  DROP TABLE "question_bank" CASCADE;
  DROP TABLE "topic_mastery" CASCADE;
  DROP TABLE "doubt_threads_messages" CASCADE;
  DROP TABLE "doubt_threads" CASCADE;
  DROP TABLE "attempts" CASCADE;
  DROP TABLE "mock_tests_sections" CASCADE;
  DROP TABLE "mock_tests" CASCADE;
  DROP TABLE "mock_tests_rels" CASCADE;
  DROP TABLE "mock_attempts_answers" CASCADE;
  DROP TABLE "mock_attempts" CASCADE;
  DROP TABLE "mock_attempts_rels" CASCADE;
  DROP TABLE "student_uploads" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_board";
  DROP TYPE "public"."enum_users_preferred_language";
  DROP TYPE "public"."enum_subjects_board";
  DROP TYPE "public"."enum_source_documents_doc_type";
  DROP TYPE "public"."enum_source_documents_board";
  DROP TYPE "public"."enum_source_documents_language";
  DROP TYPE "public"."enum_source_documents_ingest_status";
  DROP TYPE "public"."enum_knowledge_base_kind";
  DROP TYPE "public"."enum_knowledge_base_board";
  DROP TYPE "public"."enum_knowledge_base_language";
  DROP TYPE "public"."enum_question_bank_options_label";
  DROP TYPE "public"."enum_question_bank_type";
  DROP TYPE "public"."enum_question_bank_difficulty";
  DROP TYPE "public"."enum_question_bank_board";
  DROP TYPE "public"."enum_question_bank_language";
  DROP TYPE "public"."enum_question_bank_origin";
  DROP TYPE "public"."enum_question_bank_status";
  DROP TYPE "public"."enum_doubt_threads_messages_role";
  DROP TYPE "public"."enum_mock_tests_board";
  DROP TYPE "public"."enum_mock_tests_status";
  DROP TYPE "public"."enum_mock_attempts_answers_grading_status";
  DROP TYPE "public"."enum_mock_attempts_status";
  DROP TYPE "public"."enum_student_uploads_purpose";`)
}
