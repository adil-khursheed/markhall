# Operations runbook

Phase 11 hardening notes: what is automated in code, what is manual, and the
drills to run before launch. Companion to `deployment.md` and `sandbox.md`.

## Cost control (automated)

- **Per-user rate limits** — in-memory sliding windows in `src/lib/ratelimit.ts`:
  - `/api/tutor`: 15 new doubts per 10 min per user (reconnects excluded).
  - `/api/practice`: 120 requests per 10 min.
  - `/api/mock`: 240 requests per 10 min (autosave is frequent by design).
  - The sandbox has its own limiter (60 runs/min/user, queue of 8).
  - *shortcut:* these are per-process. With more than one app instance, move
    the Map to Redis (`REDIS_URL` is already in Compose) or put a global limit
    at the reverse proxy.
- **Daily token cap** — `DAILY_TOKEN_LIMIT` (default 50 000) output tokens per
  student per UTC day, counted from `agent-runs`. Checked before a run starts.
- **Answer cache** — validated, unflagged doubt answers are stored in
  `verified-answers` keyed by sha1 of normalised question + chapter + language
  (`src/lib/agent/cache.ts`). A repeat replays the stored answer through the
  normal SSE flow without running the graph. Photos always bypass the cache.
  Admins can purge stale entries from the collection.
- **Small model** — `guard`, `route`, `repair_format` and per-block repair use
  `MODEL_SMALL` (default `gpt-5.4-mini`), not the router model.

## Observability (automated + manual)

- **Run traces** — every tutor run writes one `agent-runs` row (admin ▸
  Operations ▸ Agent Runs): status (done/error/cancelled), question excerpt,
  tokens in/out, latency, error text. Filter by `error` or `cancelled` to find
  incidents.
- **Dashboards & alerts** — no external dashboards are wired. The manual
  checks until then: admin list views (agent-runs, source-documents with
  `ingestStatus = failed`, payload jobs table), and Postgres for queue depth
  (`SELECT count(*) FROM payload_jobs WHERE completed_at IS NULL;`).

## Quality

- **Golden set** — 15 doubts in `src/lib/agent/golden.ts`, run with
  `pnpm eval:golden` (needs Postgres, the sandbox and an LLM key). It exits
  non-zero on any failure and appends a line to `eval-history.jsonl` (pass
  rate history). Gate every prompt or model change on this command; compare
  against previous lines in `eval-history.jsonl` for regressions.
- **Reports** — the thumbs-down in the tutor sets `flagged` on the thread;
  admins see flagged threads as a column in Doubt Threads.

## Security

- Prompt-injection patterns are unit-tested (`tests/unit/phase11.unit.spec.ts`)
  and refused by the guard node; uploads and PDF text are untrusted data.
- Access controls: all Operations collections are admin-only; student data is
  `ownerOrAdmin`. Audit checklist: `media` currently allows public read —
  revisit before launch if anything sensitive is uploaded there.
- Uploads are EXIF-stripped and orientation-normalised by `sharp` (Phase 7).
- The sandbox is a separate container with rlimits (192 MB, 10 s), 64 KiB
  script/output caps, no filesystem/network escape — see `sandbox.md`.
- No secrets are logged: eval and seed scripts read keys from env only.

## Privacy (DPDP)

- **Export** — `GET /api/account` downloads the student's profile, threads,
  attempts, mastery, mock attempts, run traces and upload records as JSON.
- **Deletion** — `DELETE /api/account` with `{ "confirm": true }` erases the
  account and every owned record (including personal mock papers and upload
  files). Shared published mock tests stay.
- **Minimisation** — the tutor stores the question text, the answer and usage
  counters; nothing else. Uploads carry `retentionUntil` and the
  `purgeExpiredUploads` job deletes them after the retention window.
- **Indexes** — only knowledge-base chunks and question-bank items are
  embedded; student uploads and doubt messages never enter pgvector.
- **Open (human) items**: DPDP legal review for minors and verifiable
  parental consent; sign-off on the retention window and consent flow.

## Reliability

- **Backup/restore drill** — `pg_dump -Fc $DATABASE_URL > backup.dump`, then
  restore into a scratch database (`createdb scratch && pg_restore -d scratch
  backup.dump`) and run `pnpm migrate:status` against it to confirm the
  schema version. Do this before launch and after every migration.
- **Migration rollback** — `pnpm migrate:down` steps one migration back;
  `src/migrations/index.ts` lists them in order. Phase 11's `down` drops the
  two new tables. Never roll back after content has been written without a
  fresh backup.
- **Load tests** — not yet scripted. Before launch: a k6/artillery run against
  `/api/tutor` (SSE, expect heartbeat pings), `/api/practice` and the sandbox
  (expect 429 at 60 runs/min/user), within agreed latency/cost budgets.
- **Health** — `GET /api/health` returns `{"ok":true}` for the web service.

## Content operations

- Launch corpus: author, ingest and review content for the first
  board/class/subject; nothing reaches students before `published`.
- Reviewer roles and SLAs: undecided — record them here when agreed.
- Sample/synthetic content stays labelled; superseded academic-year content
  should be unpublished, not deleted.

## Product copy

- "Not affiliated with any examination board" shows in the student shell
  footer (`AppShell`).
- Sample / provisional / unverified labels: unverified answers carry the
  `flagged` badge; sample content labelling rides on collection status.
- Pricing and account policy: **explicitly undecided** — decide before public
  signup opens.
