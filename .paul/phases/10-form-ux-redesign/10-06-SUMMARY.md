---
phase: 10-form-ux-redesign
plan: 06
subsystem: ui
tags: react-hook-form, react-router, form-ux, full-page-layout

# Dependency graph
requires:
  - phase: 10-form-ux-redesign
    provides: FormSection component, useBlocker pattern, full-page form layout
provides:
  - BookingFormPage with full-page layout
  - Complete Form UX Redesign phase (all forms migrated from dialogs)
affects: phase-complete

# Tech tracking
tech-stack:
  added: []
  patterns: useBlocker with pathname guard, FK dropdown empty state handling

key-files:
  created: src/pages/bookings/ui/booking-form-page.tsx
  modified: src/shared/config/routes.ts, src/app/lib/router.tsx, src/pages/bookings/ui/bookings-page.tsx, src/pages/bookings/index.ts
  deleted: src/pages/bookings/ui/booking-create-dialog.tsx

key-decisions:
  - "FK dropdown empty state: Show message + disable submit when no customers/trips"
  - "Auth-expiry handling via mapBookingError (401/403/PGRST301)"

patterns-established:
  - "Full-page booking form with FormSection grouping matches Maintenance/Trip/Employee/Route patterns"
  - "reset() before navigate() prevents useBlocker from intercepting post-submit redirect"

# Metrics
duration: 10min
started: 2026-04-17T10:00:00Z
completed: 2026-04-17T10:10:00Z
---

# Phase 10 Plan 06: Booking Form Page Summary

**Migrated booking creation form from dialog to full-page layout, completing the Form UX Redesign phase.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 10min |
| Started | 2026-04-17T10:00:00Z |
| Completed | 2026-04-17T10:10:00Z |
| Tasks | 2 completed |
| Files modified | 5 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Full-page booking form renders | Pass | Header with back button, scrollable content, sticky footer |
| AC-2: FormSection grouping | Pass | 4 sections: Thông tin đặt chỗ, Ghế đã đặt (conditional), Ghi chú, Danh sách hành khách |
| AC-3: Seat availability preserved | Pass | Booked seats display when trip selected, via useTripBookedSeats hook |
| AC-4: FK dropdown patterns | Pass | __none__ sentinel, truncation warning, loading state, trip filtering (scheduled/in_progress only) |
| AC-4b: FK dropdown empty state | Pass | "Chưa có [khách hàng\|chuyến xe] nào" message + submit disabled when empty |
| AC-5: Dirty state blocker | Pass | useBlocker with pathname guard, reset() before navigate() to prevent post-submit interception |
| AC-6: List page updated | Pass | "Tạo đặt vé" button navigates to /bookings/new, detail dialog still functional |
| AC-7: Dialog file removed | Pass | booking-create-dialog.tsx deleted, grep returns zero results |

## Accomplishments

- **Completed Form UX Redesign phase** — All forms (Maintenance, Trip, Employee, Route, Booking) now use full-page layout with FormSection grouping
- **BookingFormPage** — Create-only form with FK dropdowns, dynamic passenger rows, total amount calculation, booked seats info
- **FK dropdown empty state pattern** — Shows helpful message and disables submit when no customers or trips available
- **Consistent useBlocker pattern** — Matches other form pages, with reset() before navigate() to prevent blocker interception

## Task Commits

Each task committed atomically:

| Task | Type | Description |
|------|------|-------------|
| Task 1: Create BookingFormPage component | feat | Created new full-page booking form with FormSection grouping, FK dropdowns, dynamic passenger rows, total amount display, useBlocker, FK dropdown empty states, explicit onSubmit error handling |
| Task 2: Wire routing + update list page + cleanup | feat | Added BOOKINGS_NEW route, BookingFormPage lazy import, updated BookingsPage to navigate instead of dialog, deleted BookingCreateDialog, updated index.ts exports |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/bookings/ui/booking-form-page.tsx` | Created | Full-page booking form with FormSection grouping, useBlocker, FK dropdown empty states |
| `src/shared/config/routes.ts` | Modified | Added BOOKINGS_NEW: '/bookings/new' |
| `src/app/lib/router.tsx` | Modified | Added BookingFormPage import and route (before BOOKINGS for correct matching) |
| `src/pages/bookings/ui/bookings-page.tsx` | Modified | Removed BookingCreateDialog import/state, button now navigates to ROUTES.BOOKINGS_NEW |
| `src/pages/bookings/index.ts` | Modified | Added BookingFormPage export |
| `src/pages/bookings/ui/booking-create-dialog.tsx` | Deleted | Replaced by BookingFormPage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| FK dropdown empty state with submit disable | Prevents invalid submissions when no customers/trips exist | Improves UX clarity |
| Explicit onSubmit error handling with mapBookingError | Audit requirement — ensures auth-expiry and other errors are surfaced consistently | Matches AC-4b and plan audit findings |
| reset() before navigate() after successful submit | Prevents useBlocker from intercepting post-submit redirect | Matches pattern from other form pages |

Or: "None - followed plan as specified"

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Plan executed exactly as specified

### Auto-fixed Issues

None

### Deferred Items

None - plan executed exactly as written

## Issues Encountered

None

## Next Phase Readiness

**Ready:**
- Phase 10 (Form UX Redesign) complete — all forms migrated from dialogs to full-page layouts
- FormSection component established across all forms (Maintenance, Trip, Employee, Route, Booking)
- useBlocker pattern consistent across all form pages
- FK dropdown patterns standardized (__none__ sentinel, truncation warning, empty state handling)

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 10-form-ux-redesign, Plan: 06*
*Completed: 2026-04-17*
