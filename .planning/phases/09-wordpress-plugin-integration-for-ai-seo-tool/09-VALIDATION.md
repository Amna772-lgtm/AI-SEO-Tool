---
phase: 9
slug: wordpress-plugin-integration-for-ai-seo-tool
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x (backend) + wp-scripts test (plugin JS) |
| **Config file** | `backend/pytest.ini` (or `pyproject.toml`) / `wordpress-plugin/package.json` |
| **Quick run command** | `cd backend && python -m pytest tests/test_api_keys.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest -x -q` |
| **Estimated runtime** | ~30 seconds (backend); ~15 seconds (plugin JS) |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_api_keys.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | API-KEYS | unit | `pytest tests/test_api_keys.py::test_generate_api_key -x` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | API-KEYS | unit | `pytest tests/test_api_keys.py::test_list_api_keys -x` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | API-KEYS | unit | `pytest tests/test_api_keys.py::test_revoke_api_key -x` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | DUAL-AUTH | unit | `pytest tests/test_api_key_auth.py -x` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 2 | SETTINGS-UI | manual | N/A — Next.js UI | N/A | ⬜ pending |
| 09-03-01 | 03 | 3 | WP-PHP | manual | Local WP instance + plugin activation | N/A | ⬜ pending |
| 09-04-01 | 04 | 4 | WP-CONNECT | manual | Connection screen flow in WP admin | N/A | ⬜ pending |
| 09-05-01 | 05 | 5 | WP-RESULTS | manual | Full audit flow in WP admin | N/A | ⬜ pending |
| 09-06-01 | 06 | 6 | WP-ORG | manual | Plugin header check + readme.txt validation | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_api_keys.py` — stubs for generate/list/revoke API key endpoints
- [ ] `backend/tests/test_api_key_auth.py` — stubs for dual-auth (Bearer token vs JWT cookie)
- [ ] `wordpress-plugin/` directory scaffold with `package.json` (wp-scripts) and `composer.json`

*Wave 0 creates the test file stubs. Backend pytest infrastructure already exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WP plugin Connection screen renders and connects | D-01 | Requires live WordPress + browser | Activate plugin, open WP admin, enter API key, verify dashboard loads |
| Live progress polling during analysis | D-08 | Requires live WordPress + backend | Click Analyze, verify phase labels update every 3s |
| Plan gating (Free vs Pro tabs) | D-16 | Requires two test accounts | Log in with Free account; verify GEO Analysis tab shows upgrade prompt |
| WordPress.org plugin header compliance | D-19 | Static file check | Run `wp plugin validate` or inspect ai-seo-tool.php headers manually |
| API key shown once at generation | D-14 | UI behavior | Generate key, navigate away, verify key is not shown again |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
