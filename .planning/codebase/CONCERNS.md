---
focus: concerns
document: CONCERNS
generated: 2026-03-30
---

# Technical Concerns & Risks

## Critical

### No Automated Tests
- **Location:** Entire codebase
- **Issue:** Zero test files found anywhere — no unit, integration, or e2e tests
- **Risk:** Any refactor or new feature can break existing functionality silently

### No Authentication or Rate Limiting
- **Location:** `backend/app/main.py`, `backend/app/api/routes/`
- **Issue:** All API endpoints are fully public with no auth, no rate limiting, no IP throttling
- **Risk:** Anyone can trigger unlimited crawl jobs, exfiltrate data, or DoS the service

## High

### Unbounded BFS Crawl (No Page Cap)
- **Location:** `backend/app/analyzers/crawler.py`
- **Issue:** The BFS crawl has no hard upper limit on pages — large sites can crawl thousands of pages consuming unbounded memory and time
- **Risk:** OOM crashes, runaway Celery tasks, Redis memory exhaustion

### Thread-Unsafe Module-Level Buffer
- **Location:** `backend/app/store/crawl_store.py` — `_pages_buffer` dict
- **Issue:** Module-level dict used as buffer across concurrent Celery tasks is not thread-safe
- **Risk:** Data corruption or missing pages when multiple crawl jobs run simultaneously

### No Structured Logging (print() everywhere)
- **Location:** 12+ locations across `backend/app/`
- **Issue:** All debug/info output uses `print()` — no `import logging`, no log levels, no structured output
- **Risk:** No log aggregation, no filtering, no production observability

### Bare Exception Swallowing
- **Location:** 66+ `except Exception` catches across 17 files
- **Issue:** Broad exception catches log nothing and silently continue — failures become invisible
- **Risk:** Bugs in GEO pipeline, crawl, and audit silently fail producing incorrect results

### No Health Check Endpoints / Monitoring
- **Location:** `backend/app/main.py`
- **Issue:** No `/health`, `/ready`, or `/metrics` endpoints; no alerting hooks
- **Risk:** Container failures go undetected; load balancers can't probe service health

### Shared SQLite Between Two Processes
- **Location:** `backend/app/db/` (used by both `backend` and `worker` containers)
- **Issue:** SQLite is not designed for concurrent writers from separate processes
- **Risk:** Database corruption or write failures under concurrent saves

### GEO Pipeline Re-fetches Already-Crawled Pages
- **Location:** `backend/app/worker/geo_pipeline.py`
- **Issue:** GEO analysis makes fresh HTTP requests to pages already crawled and stored in Redis
- **Risk:** Doubles network load, adds latency, and can produce inconsistent results vs. crawl data

## Medium

### No Redis Reconnect Logic
- **Location:** `backend/app/store/crawl_store.py`
- **Issue:** Redis connection has no retry/reconnect strategy — a blip drops all in-flight jobs
- **Risk:** Transient Redis restarts cause permanent job failures

### Deprecated `datetime.utcnow()`
- **Location:** Multiple files in `backend/app/`
- **Issue:** `datetime.utcnow()` is deprecated since Python 3.12 (use `datetime.now(UTC)`)
- **Risk:** Future Python upgrade will emit deprecation warnings; breaks eventually

### Loose Dependency Pins, No Lockfile
- **Location:** `backend/requirements.txt`, `frontend/package.json`
- **Issue:** Backend uses `>=` version pins; no `pip freeze` lockfile or `poetry.lock`
- **Risk:** `pip install` on a fresh build may pull in a breaking minor version

## Low

### `created_at` Hardcoded as `None`
- **Location:** Site status response in `backend/app/api/routes/sites.py`
- **Issue:** `created_at` field returned as `None` instead of actual job creation timestamp
- **Risk:** Frontend history/sorting by date may be unreliable

## Known TODOs / FIXMEs in Code
- CORS only allows `localhost:3000` — hardcoded, not configurable via env var
- `GOOGLE_PSI_API_KEY` hardcoded in `docker-compose.yml` (should be in `.env`)
- No `.env.example` file to guide new developers on required environment variables
