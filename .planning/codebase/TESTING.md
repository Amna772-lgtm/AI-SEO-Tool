---
focus: quality
document: TESTING
generated: 2026-03-30
---

# Testing

## Summary

**There are zero automated tests in this codebase.**

No test files, no test runner config, no CI pipeline. This is a significant gap — the entire system (crawling, GEO pipeline, scoring, API, frontend) runs without any automated verification.

---

## What Was Checked

| Item | Found? |
|------|--------|
| `test_*.py` / `*_test.py` files | No |
| `pytest.ini` / `tox.ini` / `setup.cfg [tool:pytest]` | No |
| `jest.config.*` / `vitest.config.*` | No |
| `*.test.ts` / `*.spec.ts` files | No |
| `tests/` or `__tests__/` directories | No |
| npm test script in `package.json` | No |
| CI/CD pipeline config (`.github/workflows/`) | No |

---

## Testing Frameworks Available (But Not Configured)

- **Backend**: `pytest` would be the natural choice (FastAPI has good pytest integration via `TestClient`)
- **Frontend**: `jest` + `@testing-library/react` or `vitest` — common for Next.js projects

---

## Coverage Estimate

**0%** — no tests exist.

---

## High-Priority Gaps

Given the system's complexity, the highest-value tests to add first:

1. **URL validator** (`backend/app/utils/url_validator.py`) — pure functions, easiest to test, high impact (security boundary)
2. **GEO scoring** (`backend/app/analyzers/geo_score.py`) — deterministic weights, easy to unit test
3. **Schema extraction** (`backend/app/analyzers/geo_schema.py`) — parse known HTML fixtures
4. **Crawl store** (`backend/app/store/crawl_store.py`) — Redis integration tests
5. **API routes** (`backend/app/api/routes/`) — FastAPI `TestClient` integration tests
6. **Frontend components** — snapshot or interaction tests for `GeoTab`, score rings, etc.

---

## Mocking Strategy (Recommended)

- **Claude API calls** (`geo_nlp.py`, `geo_suggestions.py`, `geo_probe.py`): Mock `anthropic.Anthropic` client
- **Google PSI API** (`audit.py`): Mock `httpx` responses
- **Redis**: Use `fakeredis` for unit tests; real Redis for integration tests
- **HTTP crawling**: Use `respx` (httpx mock library) or `pytest-httpserver`
