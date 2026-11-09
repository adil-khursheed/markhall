# Markhall — Phase-Wise Implementation TODO

Execution plan derived from `Markhall — Architecture & Implementation Blueprint.md` and the current repository state.

**Target architecture:** one Next.js + Payload 3 app, LangGraph.js agents in the Next.js server, Postgres with pgvector, a Python SymPy sandbox sidecar, and Docker Compose services `web`, `worker`, `postgres`, `sandbox`, `redis`.

**Current baseline (verified):**

- Landing page, sign-in/sign-up, authenticated dashboard prototype.
- Static sample subjects, chapters and questions in `src/components/study/data.ts`.
- Payload collections: the Phase 1 model (`users`, `media`, `subjects`, `chapters`, `source-documents`, `source-pages`, `knowledge-base`, `question-bank`, `topic-mastery`, `doubt-threads`, `attempts`, `mock-tests`, `mock-attempts`, `student-uploads`).
- No ingestion, vector search, sandbox, agent graph, streaming tutor, mock tests or grading.
- Docker Compose runs the target five-service stack.
- Design system exists in `DESIGN.md`.

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase map

| Phase | Name | Main outcome | Depends on |
| --- | --- | --- | --- |
| 0 | Foundations | Reproducible local stack and provider factories | — |
| 1 | Data model, auth, admin | All Payload collections, access rules, uploads | 0 |
| 2 | Ingestion pipeline | One document ingested, reviewed and searchable | 1 |
| 3 | Vector search | Filtered pgvector retrieval over the corpus | 2 |
| 4 | Sandbox | Safe exact-math execution service | 0 |
| 5 | Text doubt graph | End-to-end verified doubt answer | 3, 4 |
| 6 | Streaming UI | Block-safe streaming tutor interface | 5 |
| 7 | Image doubts | Handwritten and textbook photo flow | 5, 6 |
| 8 | Question generation | Reviewed AI-generated question bank | 3, 5 |
| 9 | Mock tests | Timed tests, grading and review | 8 |
| 10 | Mastery, personalisation, Hindi | Adaptive practice and language support | 9 |
| 11 | Hardening and launch | Limits, observability, privacy, ops readiness | 10 |

**Rule for every phase:** run lint, typecheck, unit/integration tests and the phase's exit checks before marking it done. Never commit secrets. Never expose draft or unpublished content to students.

---

## Phase 0 — Foundations and environment

**Goal:** A reproducible local and deployable stack with provider-agnostic model and embedding factories.

**Tasks**

- [x] Confirm exact APIs against the installed Payload `3.92.1`: jobs queue and workflow config, `afterChange` hook signatures, adapter `beforeSchemaInit` signature, migrations, upload config.
- [x] Define a validated environment schema for:
  - `DATABASE_URL`, `PAYLOAD_SECRET`, `PAYLOAD_COOKIE_PREFIX`
  - `LLM_PROVIDER`, `MODEL_ROUTER`, `MODEL_SOLVER`, `MODEL_EXPLAINER`, `MODEL_JUDGE`, `MODEL_VISION`
  - `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSION`
  - `SANDBOX_URL`, `SANDBOX_TIMEOUT_MS`, `REDIS_URL`
  - `JOBS_AUTORUN` (worker-only), storage path or S3/MinIO settings
- [x] Fail fast at boot when required env is missing; document every variable in `.env.example`.
- [x] Implement `getModel(role)` and `getEmbedder()` factories with provider adapters. One env change must switch providers.
- [x] Add a small provider smoke script: router call, structured-output call, embedding call with expected dimension.
- [x] Replace the template `docker-compose.yml` with the target five services:
  - [x] `web`: Next.js + Payload
  - [x] `worker`: same image, `JOBS_AUTORUN=true`, no public port
  - [x] `postgres`: pgvector-enabled image, persistent volume, healthcheck
  - [x] `sandbox`: isolated Python service, no network, read-only filesystem, non-root, limits
  - [x] `redis`: rate limits and short-lived state
- [x] Split Dockerfiles: app image and sandbox image.
- [x] Add healthchecks and service dependency ordering.
- [x] Configure reverse proxy notes: `proxy_buffering off`, SSE-safe timeouts, `X-Accel-Buffering: no`.
- [ ] Add structured logging with request and thread ids; add tracing provider (LangSmith or self-hosted Langfuse).
- [~] Add CI jobs for lint, typecheck, unit, integration and Playwright. (lint, typecheck, integration and Playwright are in; dedicated unit coverage beyond the env check still pending.)
- [x] Add a migration workflow: `payload migrate:create`, `payload migrate`, and keep schema push off outside local dev.

**Phase 0 notes**

- Implemented: `src/lib/env.ts`, `src/lib/ai/models.ts`, `src/instrumentation.ts`, `src/app/api/health/route.ts`, `scripts/smoke-ai.ts`, `tests/int/env.int.spec.ts`, `sandbox/`, `.dockerignore`, `.github/workflows/ci.yml`, `docs/deployment.md`.
- Verified: `pnpm typecheck`, `pnpm lint` (warnings only), Docker production build, live `docker compose` startup with all five services, `GET /api/health` → `200 {"ok":true}`, `GET /admin` → `200`, `pnpm test:int` (4 tests pass), `pnpm smoke:ai` (skips without a key), `docker compose config`.
- Secrets: runtime values come from `.env` or the process environment. Compose refuses to start without `POSTGRES_PASSWORD` and `PAYLOAD_SECRET`. CI reads `CI_POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, `LLM_API_KEY` (and optional e2e credentials) from GitHub repository secrets. No real secrets are committed.
- Local ports: web defaults to `3000` (`WEB_PORT` overrides), Compose Postgres binds `127.0.0.1:5433` (`POSTGRES_PORT` overrides). The old `markhall_pgdata` volume was left untouched; Compose now uses `pgdata17`.
- Not verified: model/embedding smoke with a real provider key; production deployment.
- Shortcut: only OpenAI-compatible providers are wired. Add a native adapter when a non-compatible provider is chosen.
- Phase 2 model baseline: `gpt-5.6-luna` for router, `gpt-5.4-mini` for solver/explainer/judge/vision, `text-embedding-3-large` at 1024 dimensions. Embeddings can use a separate `EMBEDDING_API_KEY`/`EMBEDDING_BASE_URL`; revisit after the golden-set evaluation.


**Exit criteria**

- `docker compose up` starts all five services with healthy status.
- Missing env fails with a readable error.
- Model and embedding smoke tests pass for the configured provider.
- CI is green on an empty pipeline.

---

## Phase 1 — Payload data model, auth and admin

**Goal:** The complete relational model, role-based access and admin content operations.

**Tasks**

- [x] Extend `users` with `role`, `board`, `classLevel`, `preferredLanguage`; keep `saveToJWT` for role and profile filters.
- [x] Keep the first-user admin bootstrap and verify it cannot be abused after setup.
- [x] Create `subjects`: `board`, `classLevel`, `name`, `code`, `academicYear`.
- [x] Create `chapters`: `subject`, `number`, `title`, `weightageMarks`.
- [x] Create `source-documents` (upload): `docType`, `board`, `classLevel`, `subject`, `year`, `language`, `ingestStatus`, `fileHash`.
- [x] Create `knowledge-base`: `kind`, `chapter`, `content`, `blueprint`, `pageRange`, `contentHash`, plus filter fields (`board`, `classLevel`, `subject`, `language`).
- [x] Create `question-bank` with the full field set from the blueprint:
  - [x] `stem` (Markdown + LaTeX), `type`, conditional `options`, `marks`, `difficulty`
  - [x] `board`, `classLevel`, `subject`, `chapter`, `language`
  - [x] `canonicalSolution`, `finalAnswer`, `verification`
  - [x] `origin`, conditional `pyqYear`, `sourceDocument`
  - [x] `status`, `reviewedBy`, `needsFigure`
- [x] Create `topic-mastery`: `user`, `chapter`, `attempts`, `correct`, `mastery`, `lastSeenAt`; unique per user and chapter.
- [x] Create `doubt-threads`: `user`, optional `chapter`, `messages[]`, `flagged`.
- [x] Create `attempts`: `user`, `question`, `answer`, `isCorrect`, `timeMs`.
- [x] Create `mock-tests`: `board`, `classLevel`, `subject`, `durationMinutes`, `totalMarks`, `negativeMarking`, `sections[]`, optional `generatedFor`, `blueprintSnapshot`, `status`.
- [x] Create `mock-attempts`: `user`, `test`, `startedAt`, `deadlineAt`, `submittedAt`, `answers[]`, `totalScore`, `status`; answer subfields include `question`, `response`, `images[]`, `autoScore`, `aiScore`, `finalScore`, `feedback`, `gradingStatus`.
- [x] Create `student-uploads` (upload): `owner`, `purpose`, optional `thread`, optional `attempt`, `transcription`, `transcriptionConfidence`, `retentionUntil`.
- [x] Create `source-pages` or an on-disk page store so job outputs stay small.
- [x] Add access control:
  - [x] Admin-only create/update for content collections.
  - [x] Published-only read for students on `question-bank` and `mock-tests`.
  - [x] Owner-or-admin read for `student-uploads`, `mock-attempts`, `doubt-threads`, `attempts`, `topic-mastery`.
  - [x] Never expose `verification` scripts or internal review notes to students.
- [x] Add upload validation: MIME type, size cap (for example 8 MB), image formats, EXIF stripping on student uploads.
- [x] Add a `beforeChange` file-hash hook that rejects duplicate source PDFs with the same hash and metadata.
- [x] Admin UX:
  - [x] List columns and filters for board, class, subject, status, difficulty, origin, `ingestStatus`.
  - [x] Review queue views for `in_review` questions and tests.
  - [x] Re-ingest action for failed documents.
  - [x] Live `ingestStatus` visibility.
- [x] Generate Payload types and commit them.
- [x] Add migrations for every collection; verify no destructive push outside dev.
- [x] Add a seed script for one board, class, subject and a small demo question set.

**Phase 1 notes**

- Implemented: `src/access/`, `src/fields/common.ts`, `src/hooks/`, all Phase 1 collections, updated `Users.ts` and `payload.config.ts`, admin review-queue links, a re-ingest endpoint/button, `scripts/seed.ts`, `tests/int/access.int.spec.ts`, and `src/migrations/20261109_111026_initial_phase1.ts`.
- Verified: `pnpm typecheck`, `pnpm lint` (warnings only), `pnpm test:int` (11 tests pass), `pnpm seed` twice (idempotent), `pnpm build`, and the migration applied cleanly to a fresh `markhall_migrate_test` database (27 tables) before dropping it.
- Access: content writes are admin-only; students read only published `question-bank`/`mock-tests`; owner-or-admin rules cover uploads, attempts, doubts and mastery; `verification`, `canonicalSolution`, `finalAnswer`, `reviewNotes` and score fields are field-level admin-only.
- Bootstrap: the first user becomes admin; public signup always forces `role: student` through a `publicSignup` context flag.
- Seed admin is opt-in: set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`; no default password is embedded.
- Risks: whoever signs up first still becomes admin, so seed or create the admin before exposing signup. Review queues are filtered list links, not saved custom views. Re-ingest currently resets status/error only; Phase 2 must wire the actual job. `ingestStatus` updates require an admin refresh, not live polling.
- Not verified: PDF upload and duplicate-hash rejection through the admin UI; Playwright coverage of the new admin components.

**Exit criteria**

- An admin can create a subject, chapters, upload a PDF and see pending status.
- A student account cannot read drafts, verification internals or another student's uploads/attempts.
- Types and migrations are generated and CI passes.
- Owner-only and published-only rules have integration tests.

---

## Phase 2 — Admin ingestion pipeline

**Goal:** Ingest one real or representative digital PDF end to end, with review and idempotent re-runs.

**Tasks**

- [x] Enable Payload jobs and turn auto-run on only in the `worker` via `JOBS_AUTORUN`.
- [x] Implement `ingestDocument` workflow with small outputs:
  - [x] `extract`
  - [x] `segment`
  - [x] `classify`
  - [x] `verify`
  - [x] `persist`
  - [x] `embed`
  - [x] `finish`
- [x] Queue from `source-documents.afterChange` on create; set `ingestStatus: 'pending'`.
- [x] Extraction:
  - [x] Text per page with layout for digital PDFs.
  - [x] Detect empty text layers and broken math.
  - [x] Render problem pages to images and transcribe with a vision model to Markdown + LaTeX.
  - [x] Store page text in `source-pages` or on disk, never in the job output.
- [x] Segmentation:
  - [x] Syllabus splits at chapter/topic headings into roughly 200–500-token chunks.
  - [x] Papers split at question numbers and section headers.
  - [x] Structured output (`zod`) returns stem, type, marks, options and solution when present.
- [x] Classification:
  - [x] Pick one chapter from the closed list for that subject; never allow invented chapters.
  - [x] Estimate difficulty.
- [x] Verification:
  - [x] Send numerical questions with a given answer through the sandbox.
  - [x] On mismatch, set `in_review` and store an admin note.
- [x] Persistence:
  - [x] Upsert `knowledge-base` and `question-bank` by `contentHash`; re-runs update, not duplicate.
  - [x] Ingested PYQs and samples arrive as `draft`.
- [x] Embedding:
  - [x] Batch about 64 texts per call.
  - [x] Embed a context header plus content, for example `Chapter: ... Topic: ...`.
  - [x] Skip unchanged `contentHash` rows.
  - [x] Upsert `content_embeddings` with copied filter columns.
- [x] Completion:
  - [x] Set `ingestStatus: 'ready'` with chunk, question and flagged counts.
  - [x] On final failure set `failed` and store readable error text.
  - [x] Keep per-task retries and make retries safe to repeat.
- [x] Add an `embedContent` job for single-row admin edits, queued from `knowledge-base` and `question-bank` `afterChange` hooks.
- [x] Admin review flow: approve, reject, edit, mark `needsFigure`, re-ingest.
- [x] Add ingestion integration tests with a small fixture PDF.

**Phase 2 notes**

- Implemented: `src/jobs/ingestDocument.ts`, `src/jobs/embedContent.ts`, `src/lib/ingest/` (`extract`, `segment`, `classify`, `verify`, `persist`, `embed`, `queue`, `store`, `text`), source-document and content `afterChange`/`afterDelete` hooks, admin count fields, re-ingest queueing, and `content_embeddings` in `src/migrations/20261109_155220_phase2_ingestion.ts`.
- Verified: `pnpm typecheck`, `pnpm lint` (warnings only), `pnpm test:int` (18 tests pass), `pnpm build`, and the Phase 2 migration on a fresh `markhall_migrate_test` database. The fixture-PDF test covers text extraction, re-extraction without duplicate pages, and `contentHash` upserts.
- Risks: no live model or embedding call was made because the OpenRouter account has no credits, so the full workflow is unproven end to end. The sandbox is still the Phase 4 placeholder, so numeric verification records `unavailable` and does not fail ingestion. Broken-math detection is a text-layer heuristic. The vector column is fixed at 1024 dimensions in the migration. Admin lists show status and counts after a refresh, not by live polling.
- Not verified: a real PDF through extract, segment, classify, verify, persist and embed; the failed-job/re-ingest path; embedding dimension mismatches against the configured provider.

**Exit criteria**

- One fixture document completes extraction through embedding.
- Re-running the same document creates no duplicates.
- A numerical mismatch lands in `in_review` with a note.
- A failed job shows `failed`, an error and a working re-ingest path.
- `ingestStatus` and counts are visible in the admin list.

---

## Phase 3 — pgvector storage and filtered retrieval

**Goal:** Fast, correctly filtered semantic retrieval over ingested content.

**Tasks**

- [ ] Add the `vector` extension and `content_embeddings` table through a migration or the adapter schema hook.
- [ ] Table columns: `id`, `source_type`, `source_id`, `board`, `class_level`, `subject_id`, `chapter_id`, `language`, `difficulty`, `status`, `content_hash`, `embedding`.
- [ ] Add unique constraint on `(source_type, source_id)`.
- [ ] Add HNSW index with `vector_cosine_ops` and a btree filter index.
- [ ] Implement `vectorSearch(payload, queryVec, filter, limit)`:
  - [ ] Use `payload.db.drizzle` and a transaction.
  - [ ] Set `hnsw.iterative_scan = relaxed_order` and `hnsw.ef_search`.
  - [ ] Hard-filter `source_type`, `board`, `class_level`, `status`, then optional subject, chapter, language and difficulty.
  - [ ] Hydrate rows through `payload.find` so access control and hooks still apply.
  - [ ] Return documents with similarity scores.
- [ ] Add a content API or server helper that injects filters from the session, never from model output.
- [ ] Add tests for:
  - [ ] Board/class/subject isolation.
  - [ ] Published-only filtering.
  - [ ] Chapter and language filters.
  - [ ] Empty candidate set.
  - [ ] Access control during hydration.
- [ ] Measure and record retrieval latency on a representative corpus.

**Exit criteria**

- A query for one board, class and subject never returns another board's or class's content.
- Unpublished items never appear in retrieval results.
- Search works with and without optional filters.
- Retrieval tests run in CI against a seeded vector table.

---

## Phase 4 — Python sandbox service

**Goal:** A safe, bounded service that executes SymPy scripts and returns exact values.

**Tasks**

- [ ] Build the sandbox service (FastAPI or equivalent) with a single `runPython` endpoint.
- [ ] Container hardening:
  - [ ] No network.
  - [ ] Read-only filesystem.
  - [ ] Non-root user.
  - [ ] CPU, memory and process limits.
  - [ ] 10-second default timeout, configurable per request.
  - [ ] Small worker pool with a bounded queue.
- [ ] Define the JSON protocol:
  - [ ] Input: script and timeout.
  - [ ] Output: `{ ok, stdout, stderr, exitCode }`.
  - [ ] Solver convention: print one JSON object of named values, each with `latex` and `num`.
- [ ] Install and pin SymPy; add common helpers for algebra, equations, calculus, geometry and numerical checks.
- [ ] Normalise inputs before solving:
  - [ ] Devanagari digits to ASCII.
  - [ ] Lakh/crore separators to plain integers.
- [ ] Add board-rule preamble support: pi convention, rounding, marking conventions.
- [ ] Add per-user rate limits and queue-depth protection (Redis or the service itself).
- [ ] Add tests:
  - [ ] Arithmetic and algebra.
  - [ ] Equation roots and uniqueness.
  - [ ] Numerical tolerance checks.
  - [ ] Timeout, memory and process-limit cases.
  - [ ] Malformed output and non-JSON stdout.
  - [ ] Attempted network or filesystem access.
- [ ] Document the sandbox API and failure semantics for agent nodes.

**Exit criteria**

- Exact values round-trip with both LaTeX and numeric forms.
- Timeout and resource abuse are contained and reported as structured failures.
- The sandbox cannot reach the network or write to disk.
- Load test stays within the configured worker pool and queue.

---

## Phase 5 — LangGraph text doubt flow

**Goal:** A verified, resumable text-doubt answer with no model-invented numbers.

**Tasks**

- [ ] Add LangGraph dependencies and the Postgres checkpointer.
- [ ] Define `TutorState`: messages, student profile, mode, request, context, computation, draft, validation, questions.
- [ ] Implement tools:
  - [ ] `retrieveContext` with server-injected filters.
  - [ ] `runPython` calling the sandbox.
  - [ ] `validateLatex` using KaTeX with `throwOnError: true`.
  - [ ] `saveQuestionDraft` for generated items.
- [ ] Implement nodes:
  - [ ] `guard`: scope and prompt-injection screening.
  - [ ] `route`: intent detection, embedding, nearest syllabus chunks, subject/chapter inference; clarify on low similarity or ties.
  - [ ] `retrieve`: syllabus constraints, similar PYQs, weak chapters.
  - [ ] `solve`: plan and SymPy script; proofs check each algebraic identity.
  - [ ] `run_python`: parse JSON; retry `solve` up to 3 attempts.
  - [ ] `explain`: step-by-step answer in the student's language with `<<v:key>>` placeholders.
  - [ ] `explain_unverified`: method-only answer, explicit unverified warning, flag thread.
  - [ ] `validate_format`: substitute placeholders, check KaTeX and structure, reject leftovers.
  - [ ] `repair_format`: fix the exact reported error, up to 2 attempts, then plain-text fallback.
  - [ ] `clarify` and `refuse`.
- [ ] Implement deterministic placeholder substitution and strict validation for unknown or leftover keys.
- [ ] Enforce prompt-injection rules:
  - [ ] Retrieved text is quoted data.
  - [ ] Tools never accept filters or code chosen from retrieved text.
  - [ ] Transcripts and PDF text pass through `guard`.
- [ ] Wire the graph with the exact routing from the blueprint.
- [ ] Persist checkpoints with `thread_id` equal to the `doubt-threads` id; verify pause and resume.
- [ ] Persist final messages only after `validate_format` succeeds.
- [ ] Add "report wrong answer" handling that flags the thread or creates an admin review item.
- [ ] Build a golden-doubt set (start with a representative subset, grow toward about 200 per subject) with known answers.
- [ ] Add CI evaluation for the golden set on every prompt or model change.

**Exit criteria**

- A text doubt returns a correct, step-by-step answer with all numeric values substituted from sandbox output.
- No leftover placeholders or invalid LaTeX reach the response.
- Out-of-scope input is refused; ambiguous input asks for clarification.
- Failed computation produces `explain_unverified` and an admin flag, not a confident wrong answer.
- A dropped session can resume from its thread.
- Golden-set evaluation runs in CI with a recorded pass rate.

---

## Phase 6 — Streaming tutor UI

**Goal:** Formula-safe streaming with reconnection and a coherent chat surface.

**Tasks**

- [ ] Add an SSE route handler with `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- [ ] Stream LangGraph `streamEvents` as `status`, `block`, `done` and `error` events.
- [ ] Send a heartbeat comment every 15 seconds.
- [ ] Set `X-Accel-Buffering: no` and document `proxy_buffering off` on the reverse proxy.
- [ ] Implement `createBlockAssembler`:
  - [ ] Cut on blank lines.
  - [ ] Do not cut while display or inline math is open.
  - [ ] Flush the tail at the end.
- [ ] Normalise `\(...\)` and `\[...\]` to `$...$` and `$$...$$`.
- [ ] Substitute placeholders before block validation.
- [ ] Validate each block with KaTeX; send only complete blocks.
- [ ] Route a bad block through `repair_format` alone so the rest of the answer is untouched.
- [ ] Browser rendering:
  - [ ] `react-markdown` with `remark-math` and `rehype-katex`.
  - [ ] One memoised component per finished block.
  - [ ] KaTeX CSS loaded once.
- [ ] Show in-progress text as plain shimmering text, not partial math.
- [ ] Reconnect using the SSE block index and the checkpointed thread.
- [ ] Ensure the final stored message equals the full text the student saw.
- [ ] Build the chat UI inside the Markhall design system:
  - [ ] Thread history and resume.
  - [ ] Input, send, stop.
  - [ ] Upload affordance placeholder for Phase 7.
  - [ ] Error and retry states.
  - [ ] Report wrong answer.
  - [ ] Mobile layout.
- [ ] Add tests for block assembly, open-math handling, reconnection and final-message equality.

**Exit criteria**

- No half-rendered formula appears during streaming.
- A dropped connection resumes without duplicating blocks.
- The stored thread matches the rendered answer.
- Chat is usable on mobile and keyboard-only.

---

## Phase 7 — Image doubts and student uploads

**Goal:** Safe handwritten-work and textbook-photo doubts.

**Tasks**

- [ ] Finish `student-uploads` behavior:
  - [ ] Owner-only access.
  - [ ] Purposes `doubt` and `answer`.
  - [ ] Optional thread or attempt relation.
  - [ ] Transcription text and confidence.
  - [ ] `retentionUntil` and a scheduled deletion job.
- [ ] Browser-side checks: size, sharpness, orientation; fix EXIF rotation; allow several images per doubt.
- [ ] Server-side EXIF stripping and image normalisation with `sharp`.
- [ ] Implement `read_image`:
  - [ ] Transcribe to Markdown + LaTeX.
  - [ ] Label `student_solution`, `textbook_question` or `other`.
  - [ ] Write text and confidence to the upload record.
- [ ] Route low confidence to `clarify`: show "I read this as ..." and ask to confirm, correct or retake.
- [ ] Route textbook questions through the normal doubt path after transcription.
- [ ] Implement `compare_work`:
  - [ ] Run after `run_python` when the kind is `student_solution`.
  - [ ] Check each consecutive pair of steps for equivalence with SymPy.
  - [ ] Report the first step that breaks.
  - [ ] Have `explain` teach from that step instead of re-solving.
- [ ] Treat transcription as untrusted data; pass it through `guard`.
- [ ] Update the graph routing for attachments, low confidence and compare-work.
- [ ] Never copy uploads into `content_embeddings` or any shared index.
- [ ] Add tests for EXIF stripping, retention deletion, low-confidence clarification and first-wrong-step detection.

**Exit criteria**

- A textbook photo becomes a normal doubt after transcription.
- A handwritten solution gets feedback starting at the first incorrect step.
- Low-confidence transcripts are never solved silently.
- Uploads are owner-only, EXIF-stripped and deleted after retention.

---

## Phase 8 — Question generation and admin review

**Goal:** Blueprint-aligned AI-generated questions that are computed, checked and reviewed.

**Tasks**

- [ ] Implement `plan_questions`:
  - [ ] Read the blueprint and PYQ patterns.
  - [ ] Weight weak chapters.
  - [ ] Produce N specs: type, marks, difficulty, concept.
  - [ ] Fan out with `Send`.
- [ ] Implement the `question_worker` subgraph:
  - [ ] Draft the question.
  - [ ] Run Python to compute the answer.
  - [ ] Check the item.
  - [ ] Retry up to 2 times.
- [ ] Implement `check_question`:
  - [ ] Computed answer exists, is unique and fits the type.
  - [ ] MCQ has exactly one correct option.
  - [ ] Distractors come from computed common wrong methods.
  - [ ] Concept appears in retrieved syllabus chunks.
  - [ ] Nearest existing bank item is below 0.92 cosine similarity.
  - [ ] Difficulty and marks match the spec.
- [ ] Implement `collect`: drop failed items, save the rest with `saveQuestionDraft`.
- [ ] Store `origin: 'ai_generated'`, `status: 'in_review'`, and the script/stdout in `verification`.
- [ ] Exclude `needsFigure` items from generation prompts.
- [ ] Admin review queue:
  - [ ] List generated items with verification output and failure reasons.
  - [ ] Approve, edit, reject and add reviewer identity.
  - [ ] Publish only through the `status` gate.
- [ ] Add tests for each check, especially unique answers, distractor computation and novelty.

**Exit criteria**

- A generation request produces checked drafts with computed answers.
- Every generated numeric answer is sandbox-verified.
- Near-duplicate items are rejected by the novelty check.
- No generated item reaches students before `published`.
- Rejections record a reason for prompt improvement.

---

## Phase 9 — Mock tests, timer and grading

**Goal:** A complete timed mock-test flow with trustworthy scoring and review.

**Tasks**

- [ ] Finish `mock-tests` and `mock-attempts` fields and access rules.
- [ ] Implement the `buildMockTest` workflow:
  - [ ] Read the blueprint marks pattern.
  - [ ] Add extra weight to weak chapters.
  - [ ] Use published bank items first.
  - [ ] Queue generation for missing slots before the test starts.
  - [ ] Set `in_review` or `published` by the status rule.
  - [ ] Snapshot the blueprint.
- [ ] Enforce the review gate: a test is `published` only when every question is `published`.
- [ ] Server-side timer:
  - [ ] Compute `deadlineAt` on the server at start.
  - [ ] Accept autosave writes until the deadline.
  - [ ] Reject late answers on submit.
  - [ ] Resume an in-progress attempt.
- [ ] Test-taking UI:
  - [ ] Timer, question palette, autosave indicator.
  - [ ] Shuffle question and option order per attempt.
  - [ ] Local autosave queue for flaky networks.
  - [ ] Submit and confirmation.
  - [ ] Disable the tutor for questions in an active timed attempt.
  - [ ] Release solutions only after submit.
- [ ] Grading graph:
  - [ ] `read_image` for handwritten answer images.
  - [ ] `score_objective` for MCQ and numerical answers.
  - [ ] `grade_answer` for written answers using marking points.
  - [ ] `finalize` totals marks and writes feedback.
  - [ ] Fan out one branch per answer with `Send`.
- [ ] Scoring rules:
  - [ ] MCQ by code.
  - [ ] Numerical by sandbox with a stated tolerance.
  - [ ] Written answers award marks per marking point and reference the student's own steps.
  - [ ] Re-check numeric claims through `runPython`.
  - [ ] Low confidence sets `gradingStatus: 'needs_review'` and shows a provisional score.
- [ ] Add a "Request review" action for students.
- [ ] Results UI:
  - [ ] Total score, section breakdown, per-question feedback.
  - [ ] Provisional-review state.
  - [ ] Next revision recommendation.
- [ ] Exclude questions already in the student's history from new tests.
- [ ] Mark personal tests with `generatedFor`; use only shared published tests for any comparison or percentile feature.
- [ ] Add end-to-end tests: start, autosave, timeout, submit, grade, review.

**Exit criteria**

- A timed test starts with a server deadline and cannot accept late answers.
- Objective and numerical answers score deterministically.
- Written answers show marking-point feedback and low-confidence grades are provisional.
- The tutor is unavailable during an active attempt.
- A test never publishes with an unpublished question.

---

## Phase 10 — Mastery, personalisation and Hindi

**Goal:** Close the learning loop and prepare multilingual content.

**Tasks**

- [ ] Update `topic-mastery` after each attempt:
  - [ ] Increment attempts and correct counts.
  - [ ] Recompute mastery from 0 to 1.
  - [ ] Update `lastSeenAt`.
- [ ] Write `attempts` rows for practice and mock answers.
- [ ] Feed mastery into `plan_questions`: more items from weak chapters.
- [ ] Feed mastery into `explain`: more scaffolding where mastery is low.
- [ ] Add weak/strong topic views to the dashboard using real data.
- [ ] Replace the local sample-data prototype with Payload-backed reads:
  - [ ] Subjects and chapters.
  - [ ] Published questions.
  - [ ] Mastery and attempts.
  - [ ] Mock tests and results.
- [ ] Hindi support:
  - [ ] Use a multilingual embedding model.
  - [ ] Keep the `language` filter end to end.
  - [ ] Detect legacy Hindi font garbage by Devanagari share and route to vision.
  - [ ] Normalise Devanagari digits and Indian number formats.
  - [ ] Keep English `topicTags` on chunks so Hindi or Hinglish queries find English syllabus chunks.
  - [ ] Add Hindi UI copy where confirmed.
- [ ] Add tests for mastery updates, weak-chapter weighting and Hinglish retrieval.

**Exit criteria**

- Mastery changes after real attempts and visibly affects recommendations.
- The dashboard reads real data, not `src/components/study/data.ts`.
- A Hinglish query can retrieve the relevant English syllabus chunk.
- Legacy-font pages route to vision instead of producing garbage.

---

## Phase 11 — Hardening, operations and launch readiness

**Goal:** Safe, observable, cost-bounded operation with content and legal readiness.

**Tasks**

- [ ] Rate limits and cost control:
  - [ ] Per-user limits in Redis.
  - [ ] Per-student daily token cap.
  - [ ] Cache verified doubt answers by normalised question, chapter and language.
  - [ ] Small model for `guard`, `route` and `repair_format`.
- [ ] Observability:
  - [ ] Trace every agent run.
  - [ ] Dashboards for latency, token use, job failures and sandbox errors.
  - [ ] Alerts for failed ingestion, queue depth and error spikes.
  - [ ] Job failure visibility in the admin.
- [ ] Quality:
  - [ ] Grow the golden-doubt set.
  - [ ] Run evaluations in CI on every prompt or model change.
  - [ ] Record pass rates and regressions.
  - [ ] Add a thumbs-down / report path that creates an admin queue item.
- [ ] Security:
  - [ ] Prompt-injection tests using malicious PDFs and student messages.
  - [ ] Access-control audit for every collection.
  - [ ] Upload sanitisation and EXIF checks.
  - [ ] Secret management and no secrets in logs.
  - [ ] Sandbox isolation verification.
- [ ] Privacy:
  - [ ] Legal review of DPDP requirements for minors and verifiable parental consent.
  - [ ] Data minimisation review.
  - [ ] Retention and deletion jobs verified.
  - [ ] Data export and account deletion path.
  - [ ] Confirm uploads never enter shared indexes.
- [ ] Reliability:
  - [ ] Load test chat, retrieval and sandbox.
  - [ ] Postgres backup and restore drill.
  - [ ] Migration rollback plan.
  - [ ] Deployment runbook and rollback steps.
  - [ ] Health and readiness endpoints.
- [ ] Content operations:
  - [ ] Author, ingest and review the launch corpus for the first board, class and subject.
  - [ ] Define review SLAs and reviewer roles.
  - [ ] Label all sample or unverified content.
  - [ ] Archive superseded academic-year content.
- [ ] Product copy and trust:
  - [ ] "Not affiliated with any examination board."
  - [ ] Clear sample, provisional and unverified labels.
  - [ ] Confirm pricing and account policy, or leave explicitly undecided.

**Exit criteria**

- A launch checklist is signed off: security, privacy, quality, reliability and content.
- Load tests stay within agreed latency and cost budgets.
- Golden-set evaluations gate prompt and model changes.
- Backups restore successfully.
- The launch corpus is reviewed and only published items are student-visible.

---

## Cross-cutting backlog

These items are not owned by a single phase and must be checked continuously.

- [ ] Access control tests for every new collection and route.
- [ ] No secrets in code, logs, job records or client bundles.
- [ ] Every AI-visible text path is treated as untrusted data.
- [ ] Every number shown to a student is computed, or labelled unverified.
- [ ] Every generated or ingested question has a status and a reviewer path.
- [ ] Every upload has an owner, a purpose and a retention date.
- [ ] Every new provider or model is added through `getModel`/`getEmbedder`, not hard-coded.
- [ ] Every prompt or model change runs the golden set.
- [ ] Every phase updates `.env.example`, migrations, types and tests.
- [ ] Board, class, subject and chapter filters are injected by the server, never chosen by the model.
- [ ] Sample and synthetic content stays labelled.

---

## Open decisions to resolve before or during execution

- [ ] LLM provider, model names and embedding provider/dimension.
- [ ] First production board, class and subject corpus.
- [ ] Content licensing and permission to ingest board PDFs.
- [ ] Pricing and account policy.
- [ ] Teacher and parent roles.
- [ ] Formal accessibility standard.
- [ ] DPDP parental-consent implementation and retention periods.
- [ ] Whether leaderboards or percentiles are in scope; if yes, only shared published tests.
- [ ] Exact tolerance policy for numerical grading per board and subject.
- [ ] Reverse-proxy and hosting provider details for SSE-safe deployment.
