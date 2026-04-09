---
phase: 08-admin-account-recommended-features
plan: 04
subsystem: frontend
tags: [admin, auth-guard, navigation, sidebar]
dependency_graph:
  requires: [08-02]
  provides: [admin-shell, admin-sidebar, admin-placeholder-pages, admin-nav-link]
  affects: [frontend/app/admin/*, frontend/app/dashboard/page.tsx, frontend/app/login/page.tsx]
tech_stack:
  added: []
  patterns: [useAuth-guard, usePathname-active-state, conditional-render-is_admin]
key_files:
  created:
    - frontend/app/admin/layout.tsx
    - frontend/app/admin/AdminSidebar.tsx
    - frontend/app/admin/dashboard/page.tsx
    - frontend/app/admin/users/page.tsx
    - frontend/app/admin/system/page.tsx
    - frontend/app/admin/moderation/page.tsx
  modified:
    - frontend/app/dashboard/page.tsx
    - frontend/app/login/page.tsx
decisions:
  - "Admin link placed in dashboard sidebar nav section with border-t separator, renders only when user.is_admin is true"
  - "Login redirect uses signIn() return value (AuthUser) to check is_admin — no extra API call needed"
  - "Admin layout uses router.replace('/dashboard') for non-admins and returns null while loading to prevent flash"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-09"
  tasks_completed: 2
  files_created: 6
  files_modified: 2
---

# Phase 08 Plan 04: Admin Frontend Shell Summary

Admin frontend shell built with auth-guarded layout, sidebar navigation, 4 placeholder pages, and conditional admin link in main dashboard sidebar using `useAuth().user.is_admin`.

## What Was Built

**Admin layout (`/admin/*`):** `AdminLayout` uses `useAuth()` to check `user.is_admin`. Returns `null` while `loading` is true. On mount, if `!user || !user.is_admin`, calls `router.replace("/dashboard")`. This prevents any flash of admin UI for non-admins and covers the loading race.

**AdminSidebar:** 192px fixed sidebar matching dashboard sidebar conventions. Logo bar with shield icon + "ADMIN" text. "ADMIN MENU" section label. Four nav items (Dashboard / Users / System / Moderation) with active state computed via `usePathname()`. Footer shows `user.email` in 10px muted text with a sign-out button wired to `useAuth().signOut()`.

**4 Placeholder pages:** Each page exports a named default function (`AdminDashboard`, `AdminUsers`, `AdminSystem`, `AdminModeration`) with the correct page header (title + subtitle) per UI-SPEC. Ready for plan 05 to fill with real content.

**Admin link in main sidebar:** Dashboard `page.tsx` renders a shield-icon "Admin Panel" link with `border-t` separator inside a `{user?.is_admin && ...}` conditional. Link uses `<a href="/admin/dashboard">` for full page navigation (different layout boundary).

**Admin redirect on login:** `login/page.tsx` captures the `AuthUser` returned from `signIn()` and redirects to `/admin/dashboard` if `user.is_admin`, otherwise `/dashboard`.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Created files exist
- `frontend/app/admin/layout.tsx` — contains `useAuth`, `!user.is_admin`, `router.replace("/dashboard")`
- `frontend/app/admin/AdminSidebar.tsx` — contains `ADMIN MENU`, `usePathname`, `bg-[var(--accent)]`, `signOut`
- `frontend/app/admin/dashboard/page.tsx` — contains `AdminDashboard`
- `frontend/app/admin/users/page.tsx` — contains `AdminUsers`
- `frontend/app/admin/system/page.tsx` — contains `AdminSystem`
- `frontend/app/admin/moderation/page.tsx` — contains `AdminModeration`

### Modified files contain required content
- `frontend/app/dashboard/page.tsx` — contains `user?.is_admin`, `Admin Panel`, `href="/admin/dashboard"`
- `frontend/app/login/page.tsx` — contains `user.is_admin ? "/admin/dashboard" : "/dashboard"`

### Commits
- `b079f2b` — feat(08-04): admin layout + sidebar + 4 placeholder pages
- `ff7941f` — feat(08-04): admin link in main sidebar + admin redirect on login

### TypeScript
- `npx tsc --noEmit` in `frontend/` — no errors

## Self-Check: PASSED

## Known Stubs

All 4 admin pages are intentional placeholder stubs — content will be wired in plan 05 (admin dashboard) and subsequent plans. The stubs display loading text that will be replaced. The admin shell navigation is fully functional; only page content is deferred.
