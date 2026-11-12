# Deployment notes

## Compose

```bash
cp .env.example .env
# Set DATABASE_URL, PAYLOAD_SECRET, POSTGRES_PASSWORD and any API keys in .env.
docker compose up -d postgres
pnpm migrate
pnpm test:int
docker compose up --build
```

Services: `web` (3000), `worker` (jobs only), `postgres` (pgvector), `sandbox` (internal network, no egress), `redis`.

The worker runs the same image with `JOBS_AUTORUN=true`. Phase 2 can replace it with a dedicated entry point if serving HTTP from the worker becomes wasteful.

If port `3000` or `5433` is already in use, set `WEB_PORT` or `POSTGRES_PORT` in `.env`.

Schema push is disabled because `content_embeddings` (pgvector) is outside Payload's schema and a dev push would drop it. Apply schema changes with `pnpm migrate:create` and `pnpm migrate`.

## Secrets

All secrets and API keys come from environment variables. `.env` is gitignored; never commit it.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Local/app database connection string. |
| `PAYLOAD_SECRET` | yes | Long random string for Payload sessions and tokens. |
| `POSTGRES_PASSWORD` | yes (Compose) | Password for the Compose Postgres service. |
| `LLM_API_KEY` | when calling models | Provider key. `OPENAI_API_KEY` is also accepted. |
| `LLM_BASE_URL` | no | OpenAI-compatible gateway URL. `OPENAI_BASE_URL` is also accepted. |
| `MODEL_ROUTER` / `MODEL_SOLVER` / `MODEL_EXPLAINER` / `MODEL_JUDGE` / `MODEL_VISION` | no | Role models. Defaults are in `.env.example`; `MODEL_DEFAULT` overrides any unset role. |
| `EMBEDDING_API_KEY` | no | Separate key for embeddings. Falls back to `LLM_API_KEY`/`OPENAI_API_KEY`. |
| `EMBEDDING_BASE_URL` | no | Separate OpenAI-compatible embedding URL. Falls back to `LLM_BASE_URL`/`OPENAI_BASE_URL`. |
| `EMBEDDING_MODEL` | no | Defaults to `text-embedding-3-large`. |
| `EMBEDDING_DIMENSION` | no | Must match the vector column. Defaults to `1024`. |

Docker Compose refuses to start without `POSTGRES_PASSWORD` and `PAYLOAD_SECRET`.

GitHub Actions reads these repository secrets: `CI_POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, `LLM_API_KEY`. Optional e2e overrides: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`. Add them under Settings → Secrets and variables → Actions. Never put secret values in workflow files.

## Reverse proxy (SSE)

Streaming responses need buffering disabled on the proxy:

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 3600s;
  add_header X-Accel-Buffering no;
}
```

## Migrations

Schema push is disabled in production. Generate and apply migrations before deploying:

```bash
pnpm migrate:create
pnpm migrate
```

The Phase 1 initial migration is `src/migrations/20261109_111026_initial_phase1.ts`. Phase 2 adds `src/migrations/20261109_155220_phase2_ingestion.ts`, which creates the Payload jobs tables and the `content_embeddings` table with a `vector(1024)` column. Both were verified against a fresh database.

## Seed and first admin

`pnpm seed` is idempotent. It upserts one CBSE Class 10 Science subject, a chapter, two published questions and one published mock test.

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to create an admin during seeding. There is no default password. Create the admin before exposing public signup: the first public signup becomes admin, and later signups are forced to `student`.

## Health

`GET /api/health` returns `{ "ok": true }` when Payload can query the database. Use it for the web healthcheck.

## Sandbox

The sandbox is attached only to the internal `sandboxnet`. It has no internet egress, a read-only filesystem, a non-root user, and CPU, memory and process limits. `sandbox/app.py` is a health-only placeholder until Phase 4 adds `runPython`.
