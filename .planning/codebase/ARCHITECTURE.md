---
focus: arch
document: ARCHITECTURE
generated: 2026-03-30
---

# System Architecture

## High-Level Pattern

**Distributed task queue architecture** with three containerized services:

```
Browser (Next.js)
     │  POST /analyze/  ──►  Backend API (FastAPI)
     │                            │  .delay()
     │  GET /sites/{id}/...       ▼
     │  ◄── JSON responses   Celery Worker
     │                            │
     │                            ├── crawl_site() / crawl_sampled()
     │                            ├── run_url_checks()
     │                            └── geo_pipeline()
     │                                     │
     │                              Redis (job queue +
     │                              ephemeral crawl data)
     │
     └── History/Schedules ──► SQLite (persistent)
```

## Components

### 1. Redis (`redis:7`)
- Acts as Celery broker + result backend
- Ephemeral crawl data store (2-hour TTL)
- Keys: `crawl:meta:{task_id}`, `crawl:pages:{task_id}`

### 2. Backend API (`backend` container — FastAPI)
- Entry point: `backend/app/main.py`
- Receives browser requests, validates input, dispatches Celery tasks
- Serves crawl results streamed from Redis
- Routes mounted at:
  - `POST /analyze/` — start a crawl job
  - `GET /sites/{id}` — status + metadata
  - `GET /sites/{id}/pages` — paginated crawled pages
  - `GET /sites/{id}/audit` — technical audit results
  - `GET /sites/{id}/overview` — summary stats
  - `GET /sites/{id}/geo` + sub-routes — GEO analysis results
  - `GET /history/` — past analyses (SQLite)
  - `GET|POST|DELETE /schedules/` — recurring audit schedules

### 3. Celery Worker (`worker` container)
- Entry point: `backend/app/worker/tasks.py` → `process_site` task
- Executes all crawling, analysis, and scoring in background
- Also runs **Celery Beat** scheduler (60-second tick) for recurring audits

---

## Request / Job Flow

```
1. Browser POSTs URL to /analyze/
2. FastAPI validates URL + checks robots.txt
3. Creates task_id, stores initial meta in Redis
4. Dispatches process_site.delay(task_id, url) to Celery queue
5. Returns {task_id} to browser immediately

6. Worker picks up job:
   a. Inventory phase: fetch sitemap → decide crawl strategy
   b. Crawl phase: BFS/sampled crawl, 50 concurrent, stream pages to Redis
   c. Technical checks: HTTPS, sitemap, PSI, security headers (parallel thread)
   d. Post-crawl checks: broken links, missing canonicals
   e. GEO pipeline:
      - Wave 0: site type detection
      - Wave 1 (parallel): schema, content, eeat, per-page scoring
      - Wave 2 (parallel): NLP, probe, entity
      - Suggestions generation
      - Final score computation
   f. Save completed record to SQLite

7. Browser polls GET /sites/{id} every ~2s
8. Results appear progressively as pages stream in
```

---

## Data Flow

| Stage | Source | Destination | TTL |
|-------|--------|-------------|-----|
| Crawl pages | Celery worker | Redis `crawl:pages:{id}` | 2 hours |
| Crawl metadata | Celery worker | Redis `crawl:meta:{id}` | 2 hours |
| GEO agent results | GEO pipeline | Redis `geo:{agent}:{id}` | 2 hours |
| Completed analysis | history_store | SQLite `history.db` | Permanent |
| Schedule records | API routes | SQLite `history.db` | Permanent |

---

## Key Design Decisions

- **Streaming results**: Pages written to Redis as discovered (not buffered until crawl ends) → frontend shows real-time progress
- **Buffered writes**: Pages batched in groups of 10 before RPUSH to reduce Redis round-trips
- **Smart sampling**: Sites with 100+ sitemap URLs get 50–100 representative pages instead of full crawl
- **Wave-based GEO pipeline**: Wave 0 → Wave 1 (4 parallel) → Wave 2 (3 parallel) → final score; later waves can depend on earlier results
- **Synchronous Celery tasks**: All worker functions are sync (not async); httpx used with sync client inside worker
- **SQLite for persistence**: Simple single-file DB, adequate for single-instance deployment; shared between backend + worker containers (potential write conflicts)
