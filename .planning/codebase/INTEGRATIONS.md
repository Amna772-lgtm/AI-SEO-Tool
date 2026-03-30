---
focus: tech
document: INTEGRATIONS
generated: 2026-03-30
---

# External Integrations

## APIs & External Services

**AI / NLP:**
- **Anthropic Claude API** — used for three distinct tasks:
  - NLP & semantic analysis: `backend/app/analyzers/geo_nlp.py`
  - Multi-engine AI visibility probe (simulates ChatGPT, Gemini, Grok, Perplexity, Claude responses): `backend/app/analyzers/geo_probe.py`
  - Prioritized recommendation generation: `backend/app/analyzers/geo_suggestions.py`
  - SDK: `anthropic>=0.30.0`
  - Auth env var: `ANTHROPIC_API_KEY`
  - Model env var: `ANTHROPIC_MODEL` (no default set; falls back to SDK default if empty)
  - Fallback: all three features gracefully degrade to heuristic/rule-based results when `ANTHROPIC_API_KEY` is absent or empty

**Performance Measurement:**
- **Google PageSpeed Insights API v5** — desktop and mobile performance scores plus Core Web Vitals
  - Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
  - Called from: `backend/app/analyzers/audit.py` (`_PSI_ENDPOINT`, `_PSI_TIMEOUT = 60.0`)
  - Auth env var: `GOOGLE_PSI_API_KEY`
  - Timeout: 60 seconds per request (desktop + mobile = 2 calls per audit)

## Data Storage

**In-Memory / Cache (Ephemeral):**
- **Redis 7** — job queue broker, Celery task result backend, and live crawl data store
  - Docker image: `redis:7`
  - Connection env var: `REDIS_URL` (e.g., `redis://redis:6379/0`)
  - Client: `redis>=5.0.0` Python package
  - Key patterns:
    - `crawl:meta:{task_id}` — job status and metadata (JSON string, `SETEX`)
    - `crawl:pages:{task_id}` — list of crawled page JSON objects (`RPUSH`)
    - `geo:{agent}:{task_id}` — per-agent GEO analysis results
  - TTL: 7200 seconds (2 hours) on all crawl keys; auto-expires after session
  - Store implementation: `backend/app/store/crawl_store.py`

**On-Disk (Persistent):**
- **SQLite** — permanent storage for completed analyses, history, and schedules
  - File path: `/app/data/history.db` (env var `HISTORY_DB_PATH` overrides default)
  - Mounted via Docker named volume `history_data` at `/app/data` in both `backend` and `worker` containers
  - WAL journal mode enabled for safe concurrent access between FastAPI process (reads) and Celery worker (writes)
  - Threading lock (`threading.Lock`) guards within-process concurrent writes
  - Store implementation: `backend/app/store/history_store.py`
  - Tables: `analyses` (completed GEO audits), `schedules` (recurring audit configurations)
  - No ORM — raw `sqlite3` stdlib with `conn.row_factory = sqlite3.Row`

**File Storage:**
- Local filesystem only — PDF export generation uses `reportlab>=4.0.0`, served directly from the backend container; no cloud storage

**Caching:**
- No application-level cache layer beyond Redis; Redis serves both as cache and message broker

## Authentication & Identity

**Auth Provider:** None — no user authentication system present
- No login, session management, or API key gating
- CORS restricted to `http://localhost:3000` only (`backend/app/main.py`)
- No rate limiting implemented

## Message Queue

**Celery + Redis Broker:**
- Broker URL: `REDIS_URL` env var
- Result backend: `REDIS_URL` env var (same Redis instance as broker)
- Worker config: `backend/app/worker/celery_app.py`
  - `worker_max_tasks_per_child = 10` (restart after 10 tasks)
  - `worker_max_memory_per_child = 512000` KB (512 MB memory cap)
  - Beat scheduler: 60-second interval for `check_due_schedules` periodic task
- Task: `app.worker.tasks.process_site` — 1-hour hard time limit, 55-minute soft limit
- Beat is co-located in the single worker container; not separated into its own service

## Monitoring & Observability

**Error Tracking:** None — no Sentry or equivalent integrated
**Logs:** Python `traceback` module for exception traces in task handlers (`backend/app/worker/tasks.py`); Celery worker logs at `--loglevel=info`
**Metrics:** None — no Prometheus, Datadog, or equivalent

## CI/CD & Deployment

**Hosting:** Single Docker Compose host (no cloud provider config detected)
**CI Pipeline:** None — no `.github/workflows/`, `Jenkinsfile`, or equivalent detected
**Container Registry:** No push/pull config present; images built locally

## Frontend ↔ Backend Communication

**Protocol:** HTTP REST (polling, not WebSockets)
- Base URL: `NEXT_PUBLIC_API_URL` env var (defaults to `http://localhost:8000`)
- Frontend polls backend every few seconds for crawl/audit/GEO status updates
- HTTP client: native `fetch` API (primary, used in `frontend/app/lib/api.ts`); `axios ^1.13.6` also imported but fetch is the dominant call pattern in the file

## Environment Variables

| Variable | Service | Required | Default | Purpose |
|---|---|---|---|---|
| `REDIS_URL` | backend, worker | Yes | — | Redis connection string for broker + crawl store |
| `GOOGLE_PSI_API_KEY` | backend, worker | Yes | — | Google PageSpeed Insights API authentication |
| `ANTHROPIC_API_KEY` | backend, worker | No | `""` (empty) | Anthropic Claude API — NLP, probe, suggestions |
| `ANTHROPIC_MODEL` | backend, worker | No | `""` (SDK default) | Anthropic model ID override |
| `HISTORY_DB_PATH` | backend, worker | No | `/app/data/history.db` | SQLite database file location |
| `NEXT_PUBLIC_API_URL` | frontend | No | `http://localhost:8000` | Backend API base URL for browser requests |

**Secrets location:** `.env` file in project root (existence confirmed; contents not read). Docker Compose reads `GOOGLE_PSI_API_KEY` and `ANTHROPIC_API_KEY` from this file via `${VAR}` substitution.

## Webhooks & Callbacks

**Incoming:** None — no webhook endpoints registered
**Outgoing:** None — no outbound webhook delivery

## External Robots/Crawl Checks

During URL submission, the system fetches the target site's `robots.txt` to verify:
- General crawl permission for `AI-SEO-Bot/1.0`
- Access for 7 named AI crawl bots: GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, Anthropic-AI, Claude-Web, AI-SEO-Bot
- Implementation: `backend/app/analyzers/robots.py`

---

*Integration audit: 2026-03-30*
