---
phase: 06-trip-scheduling
plan: 02
subsystem: api, ui
tags: supabase, tanstack-query, react, typescript, entity-slice

# Dependency graph
requires:
  - phase: 06-01
    provides: @entities/trip public API, TripWithDetails type
provides:
  - @entities/trip-staff entity slice (types, API, queries)
  - StaffAssignmentDialog with conflict validation
  - Staff assignment integration in trips page
affects: 06-03 (calendar view will display assigned staff)

# Tech tracking
tech-stack:
  added: []
  patterns: FSD entity slice pattern, Supabase nested joins, client-side conflict detection

key-files:
  created: src/entities/trip-staff/model/types.ts, src/entities/trip-staff/api/trip-staff.api.ts, src/entities/trip-staff/api/trip-staff.queries.ts, src/entities/trip-staff/index.ts, src/pages/trips/ui/staff-assignment-dialog.tsx
  modified: src/pages/trips/ui/trips-page.tsx

key-decisions:
  - "Supabase query: Include user_id field for proper profile join resolution"
  - "Read-only mode for completed/cancelled trips prevents accidental modifications"
  - "Client-side conflict validation with advisory warning (DB enforces hard limits)"

patterns-established:
  - "Entity slice with WithDetails type for joined data"
  - "Dialog state reset on entity change (useEffect on trip?.id)"
  - "Error mapper checks constraint name in message field (not details)"

# Metrics
duration: ~45min
started: 2026-04-16T10:30:00Z
completed: 2026-04-16T11:15:00Z
---

# Phase 6 Plan 02: Staff Assignment & Conflict Validation Summary

**Built @entities/trip-staff entity slice and StaffAssignmentDialog with conflict validation, integrated into trips list page**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 minutes |
| Started | 2026-04-16T10:30:00Z |
| Completed | 2026-04-16T11:15:00Z |
| Tasks | 3 completed |
| Files modified | 6 (5 created, 1 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Trip Staff Entity API | Pass | Entity slice at @entities/trip-staff with types (TripStaff, TripStaffWithDetails, TripStaffInsert, StaffRole, StaffConflict), API functions (fetchTripStaff, addTripStaff, removeTripStaff, fetchStaffConflicts), and TanStack Query hooks exported |
| AC-2: Staff Assignment Dialog | Pass | Dialog displays trip info header, current staff list with employee names/roles/remove buttons, add-staff form with employee dropdown (active only) and role select (Tài xế/Phụ xe) |
| AC-3: Conflict Validation | Pass | useStaffConflicts query checks overlapping time windows for scheduled/in_progress trips, warning banner displays conflicting trip details with route name and times, advisory (does not block Add button) |
| AC-4: Trip Page Integration | Pass | "Phân công" menu item added to trip row dropdown (before "Sửa"), clicking opens StaffAssignmentDialog for that trip, all CRUD operations functional |
| AC-5: Error Handling | Pass | mapTripStaffError handles 23505 (trip_staff_pkey, idx_trip_staff_one_driver), 23503, 401/403/PGRST301 with Vietnamese messages, constraint name checked in message field per audit |

## Accomplishments

- Created complete @entities/trip-staff entity slice following FSD v2.1 conventions
- Implemented StaffAssignmentDialog with loading states, read-only mode for completed/cancelled trips, and state reset on trip change
- Integrated staff assignment into trips list page with "Phân công" menu item
- Added client-side conflict validation that queries overlapping trips for selected employee
- Fixed Supabase query issue by including user_id field for proper profile join resolution

## Task Commits

| Task | Description | Status |
|------|-------------|--------|
| Task 1: Create @entities/trip-staff entity slice | Created types.ts, trip-staff.api.ts, trip-staff.queries.ts, index.ts with StaffRole, TripStaffWithDetails, TripStaffInsert, StaffConflict types and API functions | Done |
| Task 2: Create StaffAssignmentDialog | Built dialog with trip info header, current staff list, add-staff form, conflict validation, read-only mode, error handling | Done |
| Task 3: Wire dialog to trips page | Added staffDialogOpen/staffTrip state, "Phân công" menu item with Users icon, StaffAssignmentDialog render | Done |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/trip-staff/model/types.ts` | Created | StaffRole, TripStaff, TripStaffWithDetails, TripStaffInsert, StaffConflict types |
| `src/entities/trip-staff/api/trip-staff.api.ts` | Created | fetchTripStaff, addTripStaff, removeTripStaff, fetchStaffConflicts with Supabase queries |
| `src/entities/trip-staff/api/trip-staff.queries.ts` | Created | useTripStaff, useAddTripStaff, useRemoveTripStaff, useStaffConflicts hooks |
| `src/entities/trip-staff/index.ts` | Created | Public API exports for entity slice |
| `src/pages/trips/ui/staff-assignment-dialog.tsx` | Created | Dialog component with trip info, staff list, add form, conflict validation, error handling |
| `src/pages/trips/ui/trips-page.tsx` | Modified | Added staffDialogOpen, staffTrip state, "Phân công" menu item, StaffAssignmentDialog render |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential fix for data display |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Essential fix for Supabase query to properly join profile data

### Auto-fixed Issues

**1. Data Display Issue - Employee names showing "N/A"**
- **Found during:** Post-execution verification (user reported)
- **Issue:** Supabase query `employee:employees(id, profiles(id, full_name))` was not resolving profile data, employee dropdown and staff list showed "N/A"
- **Fix:** Updated STAFF_SELECT to include user_id field: `employee:employees(id, user_id, is_active, profiles(id, full_name, email, phone))` - the user_id field is required for Supabase to properly resolve the nested join through auth.users to profiles
- **Files:** src/entities/trip-staff/api/trip-staff.api.ts
- **Verification:** User confirmed employee names now display correctly
- **Root cause:** Supabase nested join syntax requires the foreign key field (user_id) to be explicitly included for proper relationship resolution

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Include user_id in employee join | Required for Supabase to resolve employees → profiles relationship through auth.users | Pattern established for future nested joins |
| Read-only mode for completed/cancelled trips | Prevents accidental modification of historical trip data | UI pattern for status-based guards |
| State reset on trip change via useEffect | Prevents stale selection from previous trip carrying over | UX pattern for dialog state management |
| Conflict validation as advisory only | DB constraints enforce hard limits (max-1-driver), client-side check provides user guidance without blocking valid edge cases | Separation of soft validation from hard constraints |

## Next Phase Readiness

**Ready:**
- @entities/trip-staff public API available for 06-03 calendar view
- Staff assignment CRUD operations functional
- Conflict detection query can be reused for calendar view
- Read-only mode pattern established for status-based UI guards

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 06-trip-scheduling, Plan: 02*
*Completed: 2026-04-16*
