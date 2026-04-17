---
phase: 10-form-ux-redesign
plan: 02
subsystem: ui
tags: [react, react-router, react-hook-form, zod, tanstack-query, form-page, routing]

requires:
  - phase: 10-01
    provides: FormSection component + dialog width fixes in existing forms
  - phase: 03-03
    provides: maintenance-log entity layer (useMaintenanceLog, useCreateMaintenanceLog, useUpdateMaintenanceLog, MAINTENANCE_TYPES, types)

provides:
  - MaintenanceFormPage component at /maintenance/new and /maintenance/:id/edit
  - MAINTENANCE_NEW + MAINTENANCE_EDIT route constants
  - Deleted maintenance-form-dialog.tsx (migration complete)
  - Pattern: full-page form with useBlocker dirty-state guard + hasInitializedRef edit guard

affects: [10-03, 10-04, 10-05, future-form-page-migrations]

tech-stack:
  added: []
  patterns:
    - useBlocker with pathname guard for dirty-state navigation protection
    - reset(values) before navigate() to clear isDirty post-submit
    - hasInitializedRef to guard edit-mode reset from background refetches
    - mapFetchError inline function for context-aware entity fetch errors (PGRST116 vs auth-expiry)
    - section-level 2-column grid (lg:grid-cols-2) with sticky form action bar

key-files:
  created:
    - src/pages/maintenance/ui/maintenance-form-page.tsx
  modified:
    - src/shared/config/routes.ts
    - src/pages/maintenance/ui/maintenance-page.tsx
    - src/pages/maintenance/index.ts
    - src/app/lib/router.tsx
  deleted:
    - src/pages/maintenance/ui/maintenance-form-dialog.tsx

key-decisions:
  - "MAINTENANCE_NEW registered before MAINTENANCE_EDIT in router — literal segments beat dynamic segments"
  - "reset(values) before navigate() after successful submit — prevents useBlocker intercepting post-submit redirect"
  - "hasInitializedRef gates edit-mode reset — background refetches cannot overwrite unsaved edits"
  - "Section-level 2-column grid (not field-level) — Thông tin chung left, Chi phí/Lịch right, Ghi chú full-width"

patterns-established:
  - "Full-page form pattern: form wraps scrollable content + flex-none sticky footer (flex flex-col flex-1 min-h-0)"
  - "useBlocker(({ currentLocation, nextLocation }) => isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname)"
  - "mapFetchError: PGRST116/406 → not found | 401/403/PGRST301 → auth expiry | else → generic"

duration: ~2h (including layout iterations)
started: 2026-04-17T00:00:00Z
completed: 2026-04-17T00:00:00Z
---

# Phase 10 Plan 02: Maintenance Form → Full Page Summary

**Maintenance form migrated from dialog to dedicated full-page routes at `/maintenance/new` and `/maintenance/:id/edit`, with 2-column section layout, sticky action bar, dirty-state blocker, and context-aware fetch error handling.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2h |
| Completed | 2026-04-17 |
| Tasks | 2 auto + 1 checkpoint |
| Files modified | 5 |
| Files created | 1 |
| Files deleted | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Create route → full page | Pass | "Thêm bảo trì" navigates to /maintenance/new with title + back button |
| AC-2: Edit route → full page | Pass | "Chỉnh sửa" navigates to /maintenance/:id/edit, form pre-filled |
| AC-3: 4 FormSection groups | Pass | Thông tin chung / Chi phí & Thực hiện / Lịch bảo trì / Ghi chú all visible |
| AC-4: Dirty state blocker | Pass | Dialog fires on unsaved navigation; pathname guard prevents false positives |
| AC-5: Direct URL / refresh | Pass | Loading skeleton shown, then form populates from fetched entity |
| AC-6: Fetch errors context-aware | Pass | PGRST116 → "không tìm thấy"; 401/403/PGRST301 → "phiên hết hạn" |
| AC-7: Submit nav not blocked | Pass | reset(values) before navigate() clears isDirty before redirect |
| AC-8: Build passes zero errors | Pass | npm run build exits 0, zero TypeScript errors |

## Accomplishments

- Full-page form created with all 9 fields across 4 FormSection groups — replaces dialog with dedicated routes
- `useBlocker` with pathname guard wired correctly — dirty state blocks navigation but not same-page interactions
- Context-aware fetch error mapping (`mapFetchError`) distinguishes not-found from auth-expiry
- Section-level 2-column layout (left: general info, right: cost/schedule) with sticky cancel/save bar
- `maintenance-form-dialog.tsx` deleted — dialog approach fully retired

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/maintenance/ui/maintenance-form-page.tsx` | Created | Full-page form (create + edit modes) |
| `src/shared/config/routes.ts` | Modified | Added MAINTENANCE_NEW + MAINTENANCE_EDIT constants |
| `src/pages/maintenance/ui/maintenance-page.tsx` | Modified | Removed dialog state; wired navigate() for add/edit |
| `src/pages/maintenance/index.ts` | Modified | Added MaintenanceFormPage export |
| `src/app/lib/router.tsx` | Modified | Registered two new routes (NEW before EDIT) |
| `src/pages/maintenance/ui/maintenance-form-dialog.tsx` | **Deleted** | No longer used; page-based form replaces it |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `MAINTENANCE_NEW` before `MAINTENANCE_EDIT` in router | Literal segments take priority; explicit ordering prevents future insertion-order ambiguity | Future plans adding nested routes won't accidentally match `/new` as `:id` |
| `reset(values)` before `navigate()` on success | `useBlocker` checks `isDirty` at navigation time — must clear before redirect | Prevents blocker dialog from appearing after successful save |
| `hasInitializedRef` to gate edit reset | Background refetches after initial load should not overwrite user's unsaved edits | Consistent with other edit forms in codebase (e.g. route-stops) |
| Section-level 2-col grid, not field-level | User-requested after reviewing initial implementation — sections side-by-side use horizontal space better | Established pattern for future multi-section form pages |
| Full-width content (no max-w constraint) | User-requested — max-w-4xl felt narrow relative to available canvas | Pages use full available width with px-1 edge padding |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | — |
| Scope additions | 2 | Layout improvements requested by user during APPLY — additive, no spec deviation |
| Deferred | 2 | ARIA dirty-state dialog; page transition animation |

**Total impact:** No plan deviations. Two layout refinements (2-column section grid, sticky footer) requested and applied during human verify checkpoint — both improve UX without affecting functional spec.

### Deferred Items

- ARIA attributes on dirty-state blocker dialog (discovered during audit)
- Page transition animation between list ↔ form (deferred from audit)

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /frontend-design | ✓ | Loaded before APPLY execution |
| /feature-sliced-design | ✓ | Loaded before APPLY execution |

Skill audit: All required skills invoked ✓

## Next Phase Readiness

**Ready:**
- `MaintenanceFormPage` pattern established — reusable reference for other form-to-page migrations in Phase 10
- Route constants pattern (`MAINTENANCE_NEW` / `MAINTENANCE_EDIT`) ready to replicate for other entities
- `useBlocker` + `hasInitializedRef` + `mapFetchError` patterns documented for next plans

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 10-form-ux-redesign, Plan: 02*
*Completed: 2026-04-17*
