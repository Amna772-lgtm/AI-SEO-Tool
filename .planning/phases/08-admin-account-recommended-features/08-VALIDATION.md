---
phase: 08
slug: admin-account-recommended-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-09
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | backend/pytest.ini |
| **Quick run command** | `cd backend && python -m pytest tests/test_admin.py -x -q` |
| **Full suite command** | `cd backend && python -m pytest tests/ -x -q` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_admin.py -x -q`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -x -q`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | D-02 | unit | `pytest tests/test_admin.py::test_is_admin_column` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | D-06 | unit | `pytest tests/test_admin.py::test_admin_dependency_rejects_non_admin` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | D-03 | integration | `pytest tests/test_admin.py::test_admin_signin_flow` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | D-11 | integration | `pytest tests/test_admin.py::test_list_users` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | D-12 | integration | `pytest tests/test_admin.py::test_change_user_plan` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 1 | D-13 | integration | `pytest tests/test_admin.py::test_disable_user` | ❌ W0 | ⬜ pending |
| 08-02-04 | 02 | 1 | D-14 | integration | `pytest tests/test_admin.py::test_delete_user_cascade` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 2 | D-16 | integration | `pytest tests/test_admin.py::test_analytics_dashboard` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 2 | D-21 | integration | `pytest tests/test_admin.py::test_celery_queue_status` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_admin.py` — stubs for admin auth, user management, analytics, system controls
- [ ] `backend/tests/conftest.py` — admin user fixture (is_admin=True)

*Existing pytest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin redirect on login | D-04 | Browser redirect behavior | Sign in as admin, verify redirect to /admin/dashboard |
| Admin sidebar layout | D-10 | Visual layout | Navigate admin pages, verify sidebar nav links |
| Recharts analytics charts | D-20 | Visual rendering | Open /admin/dashboard, verify charts render with data |
| Feature toggle effects | D-22 | Full system behavior | Toggle maintenance mode, verify site-wide effect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
