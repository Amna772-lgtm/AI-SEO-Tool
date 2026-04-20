# Deferred Items — Phase 09

## Out-of-Scope Build Issues

### Pre-existing TypeScript error in admin/system/page.tsx
- **File:** `frontend/app/admin/system/page.tsx:469`
- **Error:** `Property 'user_email' does not exist on type 'QuotaOverride'`
- **Discovered during:** Plan 02, Task 2 (build verification)
- **Confirmed pre-existing:** Yes — build failed identically before plan 02 changes
- **Action required:** Fix QuotaOverride type to include user_email field (or update the admin page to use correct field)
