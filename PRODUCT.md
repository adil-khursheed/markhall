# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

One TypeScript monorepo: a single Next.js 16 app that serves both the student product and the Payload 3 admin/API. LangGraph.js agents run inside the Next.js server process. Postgres with pgvector stores Payload data and embeddings. A small Python sidecar runs SymPy inside an isolated container for exact math. Docker Compose on a VPS runs five services: `web`, `worker` (Payload jobs), `postgres` (pgvector), `sandbox`, and `redis`. Models are provider-agnostic through a `getModel(role)` factory and a `getEmbedder()` factory driven by environment variables. Chat responses stream over server-sent events from a Next.js route handler.

## Users

Primary users are students in Classes 6–12 preparing at home for board examinations. Their job is to understand a doubt, practise the right chapter, sit timed mock tests, and see exactly where marks were lost. The current prototype and sample content focus on Classes 9–10; the data model supports Classes 6–12.

The architecture defines three boards: CBSE, ICSE/CISCE, and UP Board. The current prototype still exposes a broader "all boards" selector and shared sample content; the selector and content model must be reconciled with the architecture before launch.

Secondary users are admins and content reviewers. They upload board PDFs, inspect ingestion status, verify AI-generated questions, and publish content. Teachers and parents are not confirmed primary users.

## Product Purpose

Markhall is a board-grounded revision desk that combines four things in one place:

- an AI tutor that solves doubts with exact, machine-checked mathematics;
- practice generated from syllabus, past-paper and blueprint constraints;
- timed, scored mock tests with objective and written-answer grading;
- a reviewed content library of syllabus chunks and question-bank items.

The product exists because generic AI chat can sound confident while being wrong, and because board exam marks depend on syllabus alignment, marking-scheme structure and exact numerical work. Success means measurable improvement in students' board exam scores without inventing content, marks or affiliation.

## Positioning

Every student-facing AI answer and every generated question is either computed by code or explicitly marked as unverified, and nothing reaches students until a human publishes it. Numbers come from a SymPy sandbox, never from the model's prose; generated questions carry verification output and sit in a review queue; mock tests publish only when every question in them is published. A neighbouring product cannot truthfully copy that claim without building the same ingestion, verification, review and grading pipeline.

## Operating Context

Students revise alone at home, outside school. They type a doubt, photograph handwritten work or a textbook question, practise a chapter, or sit a timed mock test. A doubt conversation can be paused and resumed. Image transcripts are shown back to the student and treated as untrusted input. Mock-test deadlines are set on the server; answers autosave and late submissions are rejected. Solutions are released only after submission.

Admins work in Payload: they upload digital board PDFs (syllabus, sample papers, past papers), watch `ingestStatus` move from pending to ready or failed, review generated and ingested questions, and re-run failed ingestion. Slow work runs in the `worker` container so the admin UI stays responsive.

Infrastructure is Docker Compose on a VPS. The `worker` is the only process with Payload job auto-run enabled. The sandbox has no network, a read-only filesystem, a non-root user, CPU/memory/process limits and a 10-second timeout. Redis supports rate limits. Traces and evaluations cover agent runs. English is the launch language; every chunk and question carries a `language` field and the embedding model is multilingual so Hindi can be added without rebuilding the index.

## Capabilities and Constraints

Confirmed target capabilities:

- **Accounts and profiles.** Students and admins share one auth collection with `role`, `board`, `classLevel` and `preferredLanguage`. Students can read only published questions; admins manage content.
- **Content model.** Payload owns `subjects`, `chapters`, `source-documents`, `knowledge-base`, `question-bank`, `topic-mastery`, `doubt-threads`, `attempts`, `mock-tests`, `mock-attempts` and `student-uploads`. Vectors live in one sidecar table, `content_embeddings`, with copied filter columns so filtering and ranking happen in one query.
- **Admin ingestion.** Uploading a PDF stores it and queues a job. The worker extracts text per page, falls back to vision transcription for empty or broken text layers, segments syllabus and papers, classifies questions against a closed chapter list, verifies numerical answers in the sandbox, persists by content hash, embeds in batches, and marks ingestion ready or failed with counts and errors. Re-running updates instead of duplicating.
- **Retrieval.** Metadata-filtered pgvector search hard-filters board, class, subject, chapter, language and status before ranking. Board, class and subject are never written into embedded text.
- **AI doubt tutor.** A fixed LangGraph topology, not free-roaming agents: guard, route, retrieve, solve, run Python, explain, validate, repair, clarify, refuse. The solver writes a SymPy script that prints named values; the explainer uses `<<v:key>>` placeholders; deterministic code substitutes the sandbox's LaTeX. Leftover or unknown placeholders fail validation. Unverifiable work is labelled and flagged, never presented as final.
- **Image doubts.** Students can upload JPEG, PNG or WebP photos or scans. A vision node transcribes them to Markdown with LaTeX, classifies them as student solution, textbook question or other, and reports confidence. Low confidence asks the student to confirm or retake. Handwritten solutions are checked step by step in the sandbox and teaching starts at the first wrong step.
- **Question generation.** Generated items follow the blueprint and past-paper patterns, with extra weight on weak chapters. Parallel workers draft, compute, check and retry. Checks cover unique computed answers, computed distractors, syllabus alignment, novelty against the bank, and marks/difficulty fit. Items enter `in_review`, never directly to students.
- **Review gate.** `question-bank` and `mock-tests` use `draft`, `in_review`, `published` and `rejected`. Only published items reach students, and a mock test is published only when all its questions are published.
- **Mock tests.** Tests are assembled from published items, with missing slots generated before the clock starts. The server sets `deadlineAt`, accepts autosaves until then, rejects late answers, and shuffles question and option order per attempt. Objective answers are scored by code; numerical answers are checked in the sandbox with a stated tolerance; written answers are graded against marking points, with low-confidence grades marked `needs_review` and shown as provisional.
- **Mastery and personalisation.** `topic-mastery` stores attempts, correct counts, mastery from 0 to 1 and last-seen time per student and chapter. It feeds more weak-chapter items in generation and more scaffolding in explanations. Attempts and mastery updates close the loop.
- **Streaming.** SSE events (`status`, `block`, `done`, `error`) carry complete, KaTeX-validated blocks so a half-received formula never renders. Reconnection resumes from the checkpointed thread.
- **Privacy and safety.** Student uploads are owner-only, EXIF-stripped, size-capped and deleted after `retentionUntil`. Uploads never enter the shared embedding index. Retrieved text and transcripts are quoted, untrusted data. The guard screens scope and prompt injection. Students in Classes 6–12 are mostly minors; India's DPDP Act requires a legal review of verifiable parental consent before launch.
- **Operations.** Rate limits and per-student token caps, verified-answer caching, golden-doubt evaluation in CI on prompt or model changes, traces, job-failure visibility and cost tracking.

Technical constraints:

- One app process for Next.js and Payload; no separate Python agent service. Python exists only for exact math.
- Postgres is the only queue and checkpoint store; there is no separate queue service.
- Embedding dimension is configurable and must match the chosen model. The schema example uses 1024.
- Push schema changes are off outside local development; pgvector is created by migration or the adapter's schema hook.
- Figure-dependent question generation is out of scope at launch. Ingested figure questions are marked `needsFigure` and excluded from generation prompts.
- Hindi is post-launch. Legacy Hindi PDF fonts (for example Kruti Dev), Devanagari digits and lakh/crore separators need normalisation or vision fallback.
- Payload jobs API, workflow config and schema-hook signatures must be checked against the installed Payload version (3.92.1 in this repo) before implementation.
- The current repo contains only the `users` and `media` collections plus a local sample-data prototype. None of the ingestion, retrieval, sandbox, agent, mock-test or grading pipelines exist yet.

Undecided or unconfirmed:

- Final LLM and embedding providers, exact model names and embedding dimension. Phase 2 baseline: OpenAI-compatible `gpt-5.6-luna` for routing/repair, `gpt-5.4-mini` for solver/explainer/judge/vision, and `text-embedding-3-large` at 1024 dimensions; re-evaluate on the golden set before launch.
- Content licensing, coverage order and the first production board/class/subject corpus.
- Pricing and commercial model.
- Teacher or parent accounts beyond students and admins.
- Formal accessibility standard.
- Leaderboards or percentile comparisons, which must use only shared published tests if added.
- Legal position on parental consent and data retention under DPDP.

## Brand Commitments

- Name: **Markhall**, one word, capital M.
- Brand line: **"Every chapter has a seat."** and the longer **"Every chapter has a seat. Every answer earns its mark."**
- Visual world: an exam-hall seating plan. Buff paper, stamp-blue ink, examiner red used only for lost marks or weak seats, condensed stencil numerals, square geometry, registration corners and rubber-stamp completion marks.
- The product is board-neutral in its own identity and is not affiliated with any examination board.
- Sample or synthetic content is labelled as sample, never presented as an official paper or verified board material.
- Full visual rules live in `DESIGN.md`.

## Evidence on Hand

No licensed question banks, official past papers, notes, testimonials, customers, pricing or performance claims exist. The corpus described by the ingestion pipeline has not been loaded.

The current repository contains:

- a landing page, sign-in/sign-up flow and authenticated dashboard prototype;
- static sample subjects, chapters and questions in `src/components/study/data.ts`;
- Payload collections for `users` and `media` only;
- a design system in `DESIGN.md`;
- no ingestion, vector search, sandbox, agent graph, streaming tutor, mock-test or grading implementation.

Future work must not fabricate board-specific syllabi, official papers, reviewed content, affiliations, outcomes or customer evidence. Content must be authored, ingested and reviewed explicitly, and anything not yet verified must remain marked as sample or undecided.

## Product Principles

- **Correct before fluent.** Every number a student sees comes from code or is labelled unverified; never let model prose invent a result.
- **Human review is the gate.** AI-generated and ingested questions do not reach students until a reviewer publishes them.
- **Exam marks are the success metric.** Optimise for syllabus alignment, marking-scheme structure and measurable score improvement over engagement or streaks.
- **One coherent desk.** Tutor, practice, mock tests, mastery and content library share one board/class profile and one content model; they are not disconnected tools.
- **Board-neutral identity, board-specific truth.** Keep the product's own voice board-neutral, and add board-specific content only when it is authored, ingested and verified.
- **Minimum data, maximum honesty.** Collect only what the learning loop needs, protect minors' uploads, and state clearly what is sample, provisional or unverified.

## Accessibility & Inclusion

No formal standard has been confirmed. Existing design commitments already require state to be written in text as well as colour, visible keyboard focus, and a responsive layout that collapses to one column with a bottom bar on mobile. The launch language is English; Hindi is planned, so language is stored per chunk and question and the embedding model must be multilingual. Devanagari digits and Indian number formats must be normalised before math is parsed.
