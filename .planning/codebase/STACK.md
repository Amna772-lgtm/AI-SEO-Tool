---
focus: tech
document: STACK
generated: 2026-03-30
---

# Technology Stack

## Languages

**Primary:**
- Python 3.11 — all backend, API, workers, analyzers (pinned in `backend/Dockerfile`: `FROM python:3.11-slim`)
- TypeScript 5.x (`^5`) — all frontend source (`frontend/tsconfig.json` targets ES2017)

**Secondary:**
- JavaScript (ESM) — config files (`next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`)

## Runtime

**Backend:**
- CPython 3.11-slim (Docker image: `python:3.11-slim`)
- Uvicorn ASGI server `>=0.22.0` with `[standard]` extras (WebSocket + HTTP/2 support)

**Frontend:**
- Node.js (version not pinned; no `.nvmrc` present)
- Next.js App Router runtime (server-side rendering + client components)

**Package Managers:**
- Python: `pip` (no lockfile — `requirements.txt` uses `>=` version floors only)
- Node: inferred npm (no `pnpm-lock.yaml` or `yarn.lock` detected); `package.json` lockfile: not committed

## Frameworks

**Backend API:**
- FastAPI `>=0.100.0` — REST API server, route definitions in `backend/app/api/routes/`
- Pydantic `>=2.0` — request/response validation and schema definitions (`backend/app/schemas/`)

**Background Processing:**
- Celery `>=5.3.0` with `[redis]` extras — task queue and periodic scheduler
  - Config: `backend/app/worker/celery_app.py`
  - Beat scheduler embedded in worker container (`--beat` flag), 60-second polling interval

**Frontend:**
- Next.js `16.1.6` — React framework (App Router, `app/` directory structure)
- React `19.2.3` + `react-dom 19.2.3` — UI rendering
- TailwindCSS `^4` — utility-first CSS (PostCSS plugin via `@tailwindcss/postcss`)

## Key Dependencies

**Backend — Critical:**
- `httpx>=0.24.0` — async HTTP client used in crawler (`backend/app/analyzers/crawler.py`) and audit checks (`backend/app/analyzers/audit.py`); 50 concurrent connections, 15-second page timeout
- `beautifulsoup4>=4.12.0` — HTML parsing for all page metadata extraction
- `lxml>=4.9.0` — fast HTML/XML parser backend for BeautifulSoup (used in NLP analysis `backend/app/analyzers/geo_nlp.py` and elsewhere via `BeautifulSoup(html, "lxml")`)
- `redis>=5.0.0` — Python Redis client; crawl store in `backend/app/store/crawl_store.py` (2-hour TTL keys)
- `anthropic>=0.30.0` — Anthropic Python SDK for Claude API calls in NLP analysis (`backend/app/analyzers/geo_nlp.py`), AI visibility probe (`backend/app/analyzers/geo_probe.py`), and suggestion generation (`backend/app/analyzers/geo_suggestions.py`)
- `textstat>=0.7.0` — Flesch-Kincaid readability scoring for per-page readability field

**Backend — Supporting:**
- `reportlab>=4.0.0` — PDF export generation for GEO analysis reports (via `GET /sites/{id}/geo/export?format=pdf`)

**Frontend — Critical:**
- `axios ^1.13.6` — HTTP client imported in `frontend/app/lib/api.ts`; native `fetch` is also used directly for API calls in that same file
- `eslint ^9` + `eslint-config-next 16.1.6` — linting with Core Web Vitals and TypeScript rules

**Frontend — Dev:**
- `@types/node ^20`, `@types/react ^19`, `@types/react-dom ^19` — TypeScript type definitions
- `@tailwindcss/postcss ^4` — PostCSS integration for Tailwind v4

## Build Tools

**Backend:**
- Docker multi-stage build: `backend/Dockerfile`
  - Base: `python:3.11-slim`
  - Install: `pip install --no-cache-dir -r requirements.txt`
  - Entry: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

**Frontend:**
- Next.js compiler (SWC-based, built into Next.js)
- PostCSS for Tailwind CSS processing (`frontend/postcss.config.mjs`)
- TypeScript compiler (`tsc` via `noEmit: true` — type-check only, no separate emit step)
- ESLint for static analysis (`frontend/eslint.config.mjs`)

**Infrastructure:**
- Docker Compose — orchestrates three services: `redis`, `backend`, `worker` (`docker-compose.yml`)

## Configuration

**TypeScript (`frontend/tsconfig.json`):**
- `target: ES2017`
- `strict: true`
- `moduleResolution: bundler`
- Path alias: `@/*` → `./*` (project root)
- JSX: `react-jsx`

**Environment:**
- Backend env vars injected via Docker Compose (see INTEGRATIONS.md)
- Frontend env vars: `NEXT_PUBLIC_API_URL` (optional; defaults to `http://localhost:8000`)

## Platform Requirements

**Development:**
- Docker + Docker Compose (all services containerized)
- No local Python or Node environment required if using Docker

**Production:**
- Three Docker containers: `redis:7`, `ai_seo_backend` (FastAPI + Uvicorn), `ai_seo_worker` (Celery worker + Beat)
- Named Docker volume `history_data` mounted at `/app/data` in both backend and worker containers
- Deployment target: single host (no orchestration config for Kubernetes/ECS present)

---

*Stack analysis: 2026-03-30*
