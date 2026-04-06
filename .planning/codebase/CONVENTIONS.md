---
focus: quality
document: CONVENTIONS
generated: 2026-03-30
---

# Coding Conventions

## Naming Conventions

### Python (Backend)
- **Files/modules**: `snake_case` — e.g., `geo_content.py`, `page_inventory.py`, `url_validator.py`
- **Functions**: `snake_case`; private/internal helpers prefixed with `_` — e.g., `_compute_readability()`, `_fetch_html()`
- **Classes**: `PascalCase` (Pydantic models) — e.g., `AnalyzeRequest`, `PageRow`
- **Constants**: `SCREAMING_SNAKE_CASE` — e.g., `CONCURRENT_REQUESTS = 50`, `_PSI_ENDPOINT`

### TypeScript/React (Frontend)
- **Component files**: `PascalCase.tsx` — e.g., `GeoTab.tsx`, `EeatPanel.tsx`, `ContentPanel.tsx`
- **Component functions**: `PascalCase` — e.g., `export function GeoTab()`, `function SiteTypeBadge()`
- **Helper functions**: `camelCase` — e.g., `scoreColor()`, `getGeoExportUrl()`
- **Constants/config objects**: `SCREAMING_SNAKE_CASE` — e.g., `SITE_TYPE_ICONS`, `READING_LEVEL_CONFIG`
- **TypeScript types/interfaces**: `PascalCase` — e.g., `type DetailTab`, `interface PageRow`

---

## Code Style

### Python
- **Indentation**: 4 spaces (PEP 8)
- **Type hints**: Used throughout; `from __future__ import annotations` for forward compatibility
- **No formatter config** (no `pyproject.toml`, `setup.cfg`, or `.flake8` present)
- Style is informally PEP 8 compliant

### TypeScript/React
- **Indentation**: 2 spaces
- **ESLint**: `frontend/eslint.config.mjs` — ESLint 9 flat config using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- **TypeScript**: Strict mode enabled (`tsconfig.json`), target `ES2017`
- **No Prettier config** found

---

## Import Patterns

### Python
- Grouped: stdlib → local project imports (absolute paths with `app.` prefix)
- No wildcard imports
- Example from `backend/app/worker/tasks.py`:
  ```python
  import traceback
  import threading
  from app.worker.celery_app import celery
  from app.analyzers.crawler import crawl_site
  ```

### TypeScript
- Grouped: React → type imports (`import type`) → relative component imports
- Relative paths (`../../lib/`, `./`)
- Example from `frontend/app/components/geo/GeoTab.tsx`:
  ```typescript
  "use client";
  import { useState } from "react";
  import type { GeoResponse } from "../../lib/api";
  import { GeoScoreRing } from "./GeoScoreRing";
  ```

---

## Error Handling Patterns

### Python
- **API errors**: `raise HTTPException(status_code=..., detail=...)` from FastAPI routes
- **Pydantic validation**: `@field_validator` with `raise ValueError(...)` for input validation
- **Internal failures**: Broad `except Exception: pass` or `except Exception: print(traceback.format_exc())` — silent failures are common in non-critical paths
- **Fallback chains**: Some parsers use try/except to fall back to alternatives (e.g., lxml → html.parser)

### TypeScript
- **API client**: Checks `res.ok`, parses error body with `.catch(() => ({}))`, throws `new Error()`
- **Defensive access**: Heavy use of optional chaining (`?.`) and nullish coalescing (`??`)

---

## Logging

- **Python**: Uses `print()` and `print(traceback.format_exc())` throughout — **no `logging` module used anywhere**
- **TypeScript**: No explicit logging; relies on browser dev tools
- No structured logging, no log levels, no log aggregation

---

## API Design Patterns (FastAPI)

- Routes in `backend/app/api/routes/` as `APIRouter` instances, mounted in `main.py` with prefix
- Route handlers are synchronous functions (not `async def`)
- Query params use Pydantic `Query()` for validation with `alias`, `ge`, `le` constraints
- Consistent JSON responses; errors always via `HTTPException`
- Celery tasks dispatched with `.delay()` — routes return immediately with `task_id`

---

## Configuration Management

- **Backend**: `os.getenv("KEY", "default")` inline in modules — no dedicated config module
- **Frontend**: `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"` in `frontend/app/lib/api.ts`
- **Secrets**: Stored in `.env` at project root (`GOOGLE_PSI_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`)
- **No `.env.example`** file exists to document required variables

---

## Component Architecture (Frontend)

- Next.js App Router with `"use client"` directives on interactive components
- Components colocated by feature: `components/geo/`, `components/history/`, `components/schedules/`
- Data types centralized in `frontend/app/lib/api.ts`
- TailwindCSS v4 for all styling — no CSS modules or styled-components
