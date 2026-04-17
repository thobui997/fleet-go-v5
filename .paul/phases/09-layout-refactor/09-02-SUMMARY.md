---
phase: 09-layout-refactor
plan: 02
subsystem: ui
tags: [tailwind, layout, flex, scrollbar, viewport, datatable]

requires:
  - phase: 09-01
    provides: AppLayout h-screen overflow-hidden foundation + DataTable h-full flex flex-col

provides:
  - All 11 list pages: flex flex-col h-full / flex-none / flex-1 min-h-0 pattern
  - All 4 non-list pages: h-full overflow-y-auto opt-in scroll
  - Sticky table column headers working correctly (table.tsx overflow-auto fix)
  - Global slim scrollbar — hidden by default, appears on hover
affects: []

tech-stack:
  added: []
  patterns:
    - "List page layout: flex flex-col h-full → flex-none chrome → flex-1 min-h-0 table"
    - "Non-list page layout: h-full overflow-y-auto on root div"
    - "Global scrollbar: scrollbar-width thin + webkit pseudo-elements in @layer base"

key-files:
  modified:
    - src/pages/bookings/ui/bookings-page.tsx
    - src/pages/payments/ui/payments-page.tsx
    - src/pages/dashboard/ui/dashboard-page.tsx
    - src/pages/my-schedule/ui/my-schedule-page.tsx
    - src/pages/trip-calendar/ui/calendar-page.tsx
    - src/pages/check-in/ui/check-in-page.tsx
    - src/shared/ui/table.tsx
    - src/app/styles/index.css

key-decisions:
  - "Remove overflow-auto from Table wrapper div so DataTable's outer scroll container controls sticky context"
  - "Global scrollbar via * selector in @layer base — no per-element class needed"

patterns-established:
  - "List pages: flex flex-col h-full / flex-none space-y-4 pb-4 / flex-1 min-h-0"
  - "Non-list pages: h-full overflow-y-auto on root div"
  - "Sticky thead requires single overflow-auto ancestor — no nested overflow containers"

duration: ~45min
started: 2026-04-17T00:00:00Z
completed: 2026-04-17T00:00:00Z
---

# Phase 9 Plan 02: Page Adoption Summary

**All 15 pages wired to viewport-constrained layout — table bodies scroll independently, chrome stays fixed, sticky column headers work, slim auto-hide scrollbar applied globally.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Tasks | 2 completed + 1 auto-fix + 1 user-requested extension |
| Files modified | 8 |
| Build | ✓ Zero TypeScript errors |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: List pages — only table body scrolls | Pass | All 11 list pages on flex viewport layout |
| AC-2: List pages — sticky header visible while scrolling | Pass | Fixed via table.tsx overflow-auto removal |
| AC-3: List pages — empty/error states fill space correctly | Pass | Error panels inside flex-1 min-h-0 wrapper |
| AC-4: List pages — mobile unaffected | Pass | No breakpoint-conditional layout changes |
| AC-5: Non-list pages — content scrolls within viewport | Pass | All 4 pages have h-full overflow-y-auto |
| AC-6: No double padding | Pass | p-6 removed from all root divs; main provides it |

## Accomplishments

- Applied `flex flex-col h-full` pattern to all 11 list pages (9 were already correct from prior sessions; bookings + payments updated)
- Added `h-full overflow-y-auto` to all 4 non-list pages (Dashboard, My Schedule, Trip Calendar, Check-in)
- Fixed sticky column header regression: `Table` component's inner `overflow-auto` wrapper was intercepting sticky positioning context — removed it
- Extended scope per user request: global slim scrollbar (5px, hidden by default, appears on hover using theme `--border` color)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/bookings/ui/bookings-page.tsx` | Modified | flex viewport layout |
| `src/pages/payments/ui/payments-page.tsx` | Modified | flex viewport layout |
| `src/pages/dashboard/ui/dashboard-page.tsx` | Modified | h-full overflow-y-auto, removed p-6 |
| `src/pages/my-schedule/ui/my-schedule-page.tsx` | Modified | h-full overflow-y-auto |
| `src/pages/trip-calendar/ui/calendar-page.tsx` | Modified | h-full overflow-y-auto |
| `src/pages/check-in/ui/check-in-page.tsx` | Modified | h-full overflow-y-auto |
| `src/shared/ui/table.tsx` | Modified | Removed overflow-auto from wrapper div (sticky fix) |
| `src/app/styles/index.css` | Modified | Global slim scrollbar styles in @layer base |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Remove `overflow-auto` from `Table` wrapper | The `Table` component's wrapper created a nested scroll context that intercepted `sticky top-0` on `<thead>` — sticky only works when its nearest scrollable ancestor is the intended container | Sticky headers now work correctly across all DataTable instances |
| Global scrollbar via `*` selector | User requested global application; `@layer base` with `*` selector covers all scrollable areas without per-element classes | Slim, polished scrollbar UX everywhere in the app |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential — sticky header was broken |
| Scope additions | 1 | User-requested scrollbar enhancement |
| Deferred | 0 | — |

### Auto-fixed Issues

**1. Sticky header not working — Table component double overflow-auto**
- **Found during:** Human verification checkpoint
- **Issue:** `Table` component wraps `<table>` in `<div className="relative w-full overflow-auto">`. This inner `overflow-auto` div became the sticky positioning ancestor instead of DataTable's outer scroll container. Since the inner div has no fixed height, `sticky top-0` on `<thead>` never triggered.
- **Fix:** Changed `overflow-auto` → removed from `Table` wrapper div (`table.tsx:9`), so DataTable's outer `overflow-auto` is the sole scroll container.
- **Files:** `src/shared/ui/table.tsx`
- **Verification:** User approved in browser after fix

### Scope Additions

**1. Global slim scrollbar styling**
- **Requested:** During human verification, user asked for slim auto-hide scrollbar globally
- **Implementation:** Added `*` selector rules in `@layer base` — `scrollbar-width: thin`, transparent by default, border-color thumb on hover, 5px webkit scrollbar
- **Files:** `src/app/styles/index.css`

## Next Phase Readiness

**Ready:**
- Phase 9 (Layout Refactor) complete — all viewport-constrained layout goals achieved
- v0.1 MVP + Post-MVP UX improvements delivered

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 09-layout-refactor, Plan: 02*
*Completed: 2026-04-17*
