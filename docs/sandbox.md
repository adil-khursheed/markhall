# Sandbox service

Bounded Python + SymPy execution for exact math. The app speaks to it over HTTP
at `SANDBOX_URL` (Compose: `http://sandbox:8000`). Only Phase 5 `runPython`
tool nodes and Phase 2 verification call it; nothing else should.

## Endpoints

`GET /health` → `{ "ok": true }`

`POST /runPython`

```json
{
  "script": "x = symbols('x')\nanswer(root=sqrt(2))",
  "timeout": 10,
  "user": "student:42",
  "rules": { "pi": "22/7", "rounding": 2 }
}
```

- `script` (required): Python source, at most 64 KiB.
- `timeout` (optional): seconds, default `SANDBOX_DEFAULT_TIMEOUT` (10), capped at
  `SANDBOX_MAX_TIMEOUT` (30).
- `user` (optional): rate-limit key. Falls back to the `x-user-id` header, then
  the client address.
- `rules` (optional): board conventions. `pi` is `"exact"` (default) or anything
  `sympify` accepts such as `"22/7"` or `"3.14"`; `rounding` is the decimal
  places used by `round_to()` (default 2).

Response (always JSON; HTTP status is 200 only when the request was accepted):

```json
{
  "ok": true,
  "stdout": "{\"root\": {\"latex\": \"\\\\sqrt{2}\", \"num\": 1.4142135623731}}",
  "stderr": "",
  "exitCode": 0,
  "timedOut": false,
  "values": { "root": { "latex": "\\sqrt{2}", "num": 1.4142135623731 } },
  "error": null
}
```

`values` is the last non-empty stdout line parsed as a JSON object, or `null`.
`error` explains why `values` is missing. `ok` is true only when the process
exited 0; a script can exit 0 without valid solver output, so callers must check
`values` too.

## Solver convention

A solver script prints exactly one JSON object of named values, each with a
`latex` string and a numeric `num` (or `null` when the value has no numeric
form). `helpers.answer(**values)` does this for you.

## Script namespace

Every script runs with SymPy's public names plus:

| Name | Purpose |
| --- | --- |
| `normalize(text)` | Devanagari digits → ASCII, remove Indian/western digit grouping |
| `answer(**values)` | print the solver JSON convention |
| `num(value)` | best-effort float, `None` if not numeric |
| `latex_of(value)` | LaTeX for a SymPy value |
| `roots_of(expr, symbol)` | unique exact roots, sorted |
| `round_to(value, digits=None)` | round with the board convention |
| `approx(a, b, tolerance=1e-9)` | numeric tolerance check |
| `distance(point_a, point_b)` | Euclidean distance |
| `PI` | `sympy.pi`, or the `rules.pi` convention |
| `ROUNDING` | the `rules.rounding` digit count |

`Point`, `Line`, `Circle`, `Polygon` and `Triangle` are imported from
`sympy.geometry`.

## Local host access

The sandbox only joins the internal `sandboxnet`, so Docker cannot publish its
port. The `sandbox-proxy` Compose service forwards
`127.0.0.1:${SANDBOX_PORT:-8000}` to `sandbox:8000` for scripts that run on the
host, such as `pnpm eval:golden`. The sandbox itself still has no outbound
network access.

## Failure semantics

| Condition | `ok` | `exitCode` | Detail |
| --- | --- | --- | --- |
| Success | true | 0 | `values` parsed |
| Script raised | false | 1 | traceback in `stderr` |
| Timeout | false | 124 | `timedOut: true`, process group killed |
| Memory ceiling | false | 1 or 137 | allocation fails or the kernel kills it |
| Filesystem write | false | 1 or 153 | `RLIMIT_FSIZE` is 0 |
| Process limit | false | 1 | `RLIMIT_NPROC` is 8 |
| Bad output | true | 0 | `values: null`, `error` set |
| Queue full | — | — | HTTP 429, `{ "ok": false, "error": "sandbox queue is full" }` |
| Rate limited | — | — | HTTP 429, `{ "ok": false, "error": "rate limit exceeded" }` |
| Bad request | — | — | HTTP 400 |
| Script too large | — | — | HTTP 413 |

Agent nodes should treat a non-200, a false `ok`, a `timedOut`, or a null
`values` as "computation unavailable" and fall back to `explain_unverified`.
Never invent a number from `stderr` or model prose.

## Limits

Configured with `SANDBOX_*` environment variables (see `.env.example`):

- `SANDBOX_WORKERS=2` execution slots.
- `SANDBOX_QUEUE_LIMIT=8` waiting requests; beyond `workers + queue` the service
  returns 429 instead of growing memory.
- `SANDBOX_MEMORY_MB=192` address-space limit per script.
- `SANDBOX_RATE_LIMIT=60` requests per minute per `user` key, tracked in memory.
- Container: no network (`sandboxnet` is `internal`), read-only root filesystem,
  writable `/tmp` tmpfs, non-root `10001`, `pids_limit: 64`, `mem_limit: 512m`,
  `cpus: 1.0`.

## Tests

```bash
docker build -t markhall-sandbox ./sandbox
docker run --rm --network none --read-only --tmpfs /tmp \
  --pids-limit 64 --memory 512m --user 10001:10001 \
  -e SANDBOX_TEST_ISOLATED=1 markhall-sandbox python -m unittest -v test_app
```

`SANDBOX_TEST_ISOLATED=1` enables the network-blocked assertion; the same suite
runs in CI.
