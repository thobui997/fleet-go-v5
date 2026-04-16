---
phase: 06-trip-scheduling
plan: 01
subsystem: trips
tags: tanstack-query, supabase, react-hook-form, zod, postgres, fk-joins

# Dependency graph
requires:
  - phase: 03-fleet-management
    provides: Vehicles entity with license_plate, VehicleType entity
  - phase: 04-route-management
    provides: Routes entity with origin/destination stations, Stations entity
provides:
  - Trips entity with route/vehicle FK joins
  - Trips CRUD page with status/route/date filters
  - Trip form with datetime validation and cross-field checks
  - Trip status badge component
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [fk-join-selects, timezone-datetime-inputs, zod-preprocess-nullable, hasInitializedRef-guard]

key-files:
  created:
    - src/entities/trip/model/types.ts
    - src/entities/trip/api/trip.api.ts
    - src/entities/trip/api/trip.queries.ts
    - src/entities/trip/index.ts
    - src/pages/trips/model/trip-form-schema.ts
    - src/pages/trips/ui/trip-status-badge.tsx
    - src/pages/trips/ui/trip-form-dialog.tsx
    - src/pages/trips/ui/trip-delete-dialog.tsx
    - src/pages/trips/ui/trips-page.tsx
    - src/pages/trips/index.ts
  modified:
    - src/app/lib/router.tsx

key-decisions:
  - "Datetime toLocal: Use new Date() methods not iso.slice(0,16) for correct local timezone display"
  - "Price override: z.preprocess for empty-string→null before numeric coercion prevents 'free trip' bug"
  - "ColumnDef keys: Must use keyof TData type constraint, no arbitrary strings"

patterns-established:
  - "FK dropdown: FK_DROPDOWN_PAGE_SIZE=1000 with truncation warning when count > data.length"
  - "Dialog close guard: onOpenChange ignores close when isPending"
  - "Error mapping: SQLSTATE-based using .code field with context parameter"
  - "Status badge: Vietnamese labels with variant mapping to Tailwind classes"

# Metrics
duration: 30min
started: 2026-04-16T09:30:00Z
completed: 2026-04-16T10:00:00Z
---

# Phase 6 Plan 01: Trip CRUD Summary

**Trip CRUD entity with DataTable, filters (status/route/date), form dialog with FK dropdowns, datetime validation, and router wiring.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 30 min |
| Started | 2026-04-16T09:30:00Z |
| Completed | 2026-04-16T10:00:00Z |
| Tasks | 3 completed |
| Files modified | 10 created, 1 modified |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Trip Entity API | Pass | All CRUD hooks exported from @entities/trip with TripWithDetails type including route+vehicle FK joins |
| AC-2: Trip List Page | Pass | DataTable with columns (route name→destination, vehicle license plate, departure/arrival times, status badge, price override), filters (status select, route dropdown, date from/to), pagination, error state with retry button |
| AC-3: Trip Form Dialog | Pass | Route FK dropdown (from useRoutes), vehicle FK dropdown (from useVehicles), datetime-local inputs, cross-field validation (departure < arrival), status select (edit mode only), price override optional, notes optional textarea |
| AC-4: Trip Delete | Pass | FK error 23503 → "Chuyến đi đã được phân công nhân viên hoặc có vé đặt, không thể xóa" |
| AC-5: Router Wired | Pass | TripsPage renders at /trips (not PlaceholderPage) |
| AC-6: List Error State | Pass | Inline error message + retry button when query fails, empty DataTable not shown |

## Accomplishments

- **Trip entity with FK joins**: PostgREST nested select returns route (with origin/destination stations) and vehicle (license_plate) in single query
- **Timezone-aware datetime handling**: toDatetimeLocal uses `new Date()` methods instead of `iso.slice(0,16)` to correctly display local time in datetime-local inputs
- **Price override validation**: z.preprocess converts empty string to null before numeric coercion, preventing silent null→0 conversion that would create "free trips"
- **Complete CRUD page**: List with filters, create/edit forms, delete confirmation, all with Vietnamese UI strings

## Task Commits

Each task committed atomically:

| Task | Type | Description |
|------|------|-------------|
| Task 1: Create @entities/trip entity slice | feat | Trip types, API with FK joins, TanStack Query hooks |
| Task 2: Create Trips list page with DataTable and filters | feat | Page with filters, status badge, form schema |
| Task 3: Create Trip form dialog + delete dialog + router wiring | feat | Form with FK dropdowns, delete dialog, router.tsx wired |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/trip/model/types.ts` | Created | Trip, TripWithDetails, TripInsert, TripUpdate, TripListParams, TRIP_STATUSES |
| `src/entities/trip/api/trip.api.ts` | Created | fetchTrips (paginated with filters), fetchTrip, createTrip, updateTrip, deleteTrip with TRIP_SELECT FK join |
| `src/entities/trip/api/trip.queries.ts` | Created | useTrips, useTrip, useCreateTrip, useUpdateTrip, useDeleteTrip TanStack Query hooks |
| `src/entities/trip/index.ts` | Created | Public API exports for entity slice |
| `src/pages/trips/model/trip-form-schema.ts` | Created | Zod schema, mapTripError (23503/23514/22007/auth), serializeToInsert, toDatetimeLocal, FK_DROPDOWN_PAGE_SIZE |
| `src/pages/trips/ui/trip-status-badge.tsx` | Created | Status badge with Vietnamese labels and variant mapping |
| `src/pages/trips/ui/trip-form-dialog.tsx` | Created | Form with route/vehicle FK dropdowns, datetime inputs, hasInitializedRef guard |
| `src/pages/trips/ui/trip-delete-dialog.tsx` | Created | Delete confirmation with FK error handling |
| `src/pages/trips/ui/trips-page.tsx` | Created | DataTable with columns, filters, error state, pagination |
| `src/pages/trips/index.ts` | Created | Page exports (TripsPage, TripStatusBadge) |
| `src/app/lib/router.tsx` | Modified | Added TripsPage import, replaced PlaceholderPage with TripsPage for ROUTES.TRIPS |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Runtime fixes | 1 | Low - incorrect require() usage fixed immediately |
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Minimal - one runtime fix for ES module compatibility

### Runtime Fixes

**1. ES Module Import Fix**
- **Found during:** Runtime testing after build completion
- **Issue:** `const { TripStatusBadge } = require('./trip-status-badge');` caused "ReferenceError: require is not defined" in browser
- **Fix:** Replaced with proper ES module import at top of file: `import { TripStatusBadge } from './trip-status-badge';`
- **Files:** `src/pages/trips/ui/trips-page.tsx`
- **Verification:** Build passed, runtime error resolved
- **Impact:** Low - standard ES module pattern, should have been done initially

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| TypeScript: ColumnDef key type constraint | Used valid keyof TripWithDetails keys (route, vehicle, id) instead of arbitrary strings |
| TypeScript: PriceCell function signature | Changed to inline formatPrice function to match cell(value: TripValue) signature |
| TypeScript: isLoading property on query data | Removed isLoading check (not available on data type), use undefined check instead |

## Key Patterns Applied

- **FK Joins**: PostgREST nested select with `route:routes(...), vehicle:vehicles(...)` for single-query related data
- **Datetime Handling**: `toDatetimeLocal(iso)` uses `new Date()` methods (getFullYear, getMonth, etc.) for correct local timezone
- **Form Validation**: `z.preprocess((v) => (v === '' ? null : v), z.coerce.number().nullable())` for optional numeric fields
- **FK Dropdowns**: `FK_DROPDOWN_PAGE_SIZE = 1000` with warning when count > data.length
- **Dialog Guards**: `onOpenChange` ignores close when `isPending` prevents accidental closes during mutation
- **hasInitializedRef**: Prevents background refetch from overwriting form state in edit mode
- **Error Mapping**: SQLSTATE-based with context parameter (`mutate`|`delete`) for operation-specific messages
- **Status Badge**: Vietnamese labels with Tailwind variant classes for visual distinction

## Next Phase Readiness

**Ready:**
- @entities/trip public API available for 06-02 (Staff Assignment) and 06-03 (Calendar View)
- Trip CRUD fully functional with all validations
- Router wired at /trips for navigation
- Status badge component reusable in other views

**Concerns:**
- Timezone-aware date range filtering uses simple date strings (client-side only)
- formatCurrency utility not used (inline formatPrice function instead)

**Blockers:**
- None

**Phase 6 Status:**
- 1 of 3 plans complete (06-01)
- Remaining: 06-02 (Staff Assignment + Conflict Validation), 06-03 (Calendar View + My Schedule)
- ROADMAP.md indicates Phase 6 depends on completed 06-01 for subsequent plans

---
*Phase: 06-trip-scheduling, Plan: 01*
*Completed: 2026-04-16*
