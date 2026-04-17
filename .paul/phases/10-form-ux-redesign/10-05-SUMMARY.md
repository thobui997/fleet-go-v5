---
phase: 10-form-ux-redesign
plan: 05
subsystem: ui
tags: react, react-hook-form, dnd-kit, full-page-form

# Dependency graph
requires:
  - phase: 10-form-ux-redesign
    provides: FormSection component, full-page form pattern, useBlocker pattern
provides:
  - Full-page route form with create/edit modes
  - Full-page route stops editor with drag-and-drop
affects: phase-10-complete

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Full-page form layout with page header + scrollable content + sticky footer
    - "Lưu & Sub-page" button pattern for multi-step workflows
    - Context-aware fetch error mapping (PGRST116 vs auth-expiry)

key-files:
  created:
    - src/pages/routes/ui/route-form-page.tsx
    - src/pages/routes/ui/route-stops-page.tsx
  modified:
    - src/shared/config/routes.ts
    - src/app/lib/router.tsx
    - src/pages/routes/ui/routes-page.tsx
    - src/pages/routes/index.ts

key-decisions:
  - "Follow TripFormPage pattern for RouteFormPage"
  - "RouteStopsPage follows StaffAssignmentPage pattern as full sub-page"
  - "FK dropdown empty state disables submit to prevent 23505 violation"

patterns-established:
  - "Full-page form: useRoute for edit mode, loading skeleton, mapFetchError"
  - "Sub-page navigation: reset() before navigate() to avoid blocker intercept"
  - "Auth-expiry explicit: 401/403/PGRST301 mapped to Vietnamese message"

# Metrics
duration: 15min
started: 2026-04-17T15:30:00Z
completed: 2026-04-17T15:45:00Z
---

# Phase 10 Plan 05: Route Form Page Summary

**Migrated Route form dialog and Route stops dialog to full-page layouts, completing the final form migration in Phase 10.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 15min |
| Started | 2026-04-17T15:30:00Z |
| Completed | 2026-04-17T15:45:00Z |
| Tasks | 3 completed |
| Files modified | 6 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Route form — create mode | Pass | Full-page form at /routes/new with FormSection grouping, all fields present |
| AC-2: Route form — edit mode | Pass | useRoute(id) fetch with loading skeleton, mapFetchError for PGRST116/auth-expiry |
| AC-3: Route stops sub-page | Pass | /routes/:id/stops with DnD, origin/destination locked, add/remove/reorder stops |
| AC-4: Dirty state protection | Pass | useBlocker with pathname guard, confirmation dialog on unsaved navigation |
| AC-5: Build passes | Pass | npm run build completed with zero TypeScript errors |

## Accomplishments

- **RouteFormPage**: Full-page form following TripFormPage pattern with create/edit modes, FormSection grouping ("Thông tin chung", "Chi tiết"), FK dropdowns with empty state warnings and truncation alerts, "Lưu & Điểm dừng" button for sub-page navigation
- **RouteStopsPage**: Full sub-page following StaffAssignmentPage pattern with DnD functionality preserved, loading skeleton, mapFetchError for route data fetch, auth-expiry explicit handling
- **Navigation wiring**: All routes constants added, router configured, list page updated to page navigation (no more dialogs), exports updated
- **Pattern consistency**: All complex forms now use full-page layout across Maintenance, Trip, Employee, and Route entities

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Create RouteFormPage | (part of phase commit) | feat | Full-page form with useBlocker, mapFetchError, FK dropdown patterns |
| Task 2: Create RouteStopsPage | (part of phase commit) | feat | Full sub-page with DnD, loading skeleton, auth-expiry handling |
| Task 3: Wire up routes/router | (part of phase commit) | feat | Routes constants, router config, list page navigation, exports |

Phase metadata: `10-05-PLAN` (audited, applied)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/routes/ui/route-form-page.tsx` | Created | Full-page route form with create/edit modes, useBlocker, mapFetchError |
| `src/pages/routes/ui/route-stops-page.tsx` | Created | Full-page stops editor with DnD, loading skeleton, auth-expiry handling |
| `src/shared/config/routes.ts` | Modified | Added ROUTES_NEW, ROUTES_EDIT, ROUTES_STOPS constants |
| `src/app/lib/router.tsx` | Modified | Added RouteFormPage and RouteStopsPage routes |
| `src/pages/routes/ui/routes-page.tsx` | Modified | Updated navigation from dialog to page routes, removed dialog state |
| `src/pages/routes/index.ts` | Modified | Exported RouteFormPage and RouteStopsPage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep old dialogs for safety | route-form-dialog.tsx and route-stops-dialog.tsx not deleted | Safe rollback path if needed |
| "Lưu & Điểm dừng" button in create mode only | Edit mode goes back to list; stops only configured during creation | Consistent with TripFormPage → StaffAssignmentPage flow |
| FK dropdown empty state disables submit | Prevents 23505 FK violation when no stations exist | Better UX than cryptic database error |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Plan executed exactly as specified

### Auto-fixed Issues

None - all tasks completed as planned

### Deferred Items

None - plan executed exactly as written

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Duplicate RoutesPage import in router.tsx | Removed duplicate import line |
| Unused AlertTriangle import in route-stops-page.tsx | Removed unused import |

## Next Phase Readiness

**Ready:**
- Phase 10 complete: All 5 plans delivered (FormSection, MaintenanceFormPage, TripFormPage+StaffAssignmentPage, EmployeeFormPage, RouteFormPage+RouteStopsPage)
- Consistent full-page form pattern established across all complex forms
- All dialog-based forms migrated to pages

**Concerns:**
- None

**Blockers:**
- None

**Phase Status:** COMPLETE - All 5 plans delivered, consistent full-page form UX established

---
*Phase: 10-form-ux-redesign, Plan: 05*
*Completed: 2026-04-17*
