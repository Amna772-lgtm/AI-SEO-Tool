---
phase: 7
slug: add-a-competitor-tracking-feature-to-the-ai-seo-tool
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend) / manual browser (frontend) |
| **Config file** | `backend/pytest.ini` or `backend/setup.cfg` (if exists) |
| **Quick run command** | `cd backend && python -m pytest tests/ -x -q 2>/dev/null` |
| **Full suite command** | `cd backend && python -m pytest tests/ -v 2>/dev/null` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/ -x -q 2>/dev/null`
- **After every plan wave:** Run `cd backend && python -m pytest tests/ -v 2>/dev/null`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | DB tables | unit | `grep -r "competitor_groups" backend/app/store/history_store.py` | ✅ | ⬜ pending |
| 7-01-02 | 01 | 1 | DB helpers | unit | `grep -r "get_or_create_competitor_group" backend/app/store/history_store.py` | ✅ | ⬜ pending |
| 7-02-01 | 02 | 2 | Claude discovery | manual | Browser: POST /competitors/discover returns 5-8 suggestions | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 2 | API routes | unit | `grep -r "competitor_groups" backend/app/api/routes/competitors.py` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 3 | Frontend tab | manual | Browser: Competitors tab visible in nav | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 3 | Radar chart | manual | Browser: RadarChart renders with 6 axes | ❌ W0 | ⬜ pending |
| 7-04-01 | 04 | 4 | Plan gating | manual | Browser: Free user sees upgrade prompt | ❌ W0 | ⬜ pending |
| 7-04-02 | 04 | 4 | Integration | manual | Browser: End-to-end competitor discovery + audit + comparison | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/app/api/routes/competitors.py` — stub file for competitors routes
- [ ] `backend/app/store/history_store.py` — `competitor_groups` + `competitor_sites` tables added to `init_db()`
- [ ] `frontend/app/components/competitors/CompetitorsTab.tsx` — stub component

*Existing test infrastructure (pytest) covers backend verification; frontend verified manually.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude returns 5-8 competitor suggestions | D-06 | Requires live Claude API call | POST /competitors/discover with a known audited site; confirm 5-8 items returned |
| Radar chart 6 axes render correctly | D-15 | Frontend visual | Load Competitors tab with 2+ audited sites; verify hexagonal radar chart |
| Free user upgrade prompt | D-19 | Requires plan-gated UI | Log in as Free user; navigate to Competitors tab; confirm upgrade CTA shown |
| Pro user cap at 3 competitors | D-13 | Requires quota state | Log in as Pro user; add 3 competitors; attempt to add 4th; confirm 403 returned |
| Agency user cap at 10 competitors | D-13 | Requires quota state | Log in as Agency user; verify up to 10 competitors allowed |
| Competitor audit quota consumption | D-17 | Requires live audit | Submit competitor audit; verify monthly usage counter incremented |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
