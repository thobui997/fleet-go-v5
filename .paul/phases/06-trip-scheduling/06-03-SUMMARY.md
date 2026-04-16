---
phase: 06-trip-scheduling
plan: 03
subsystem: ui
tags: tanstack-query, dayjs, calendar, scheduling, supabase

# Dependency graph
requires:
  - phase: 06-trip-scheduling (06-01)
    provides: Trip CRUD entity, TripWithDetails type, TRIP_SELECT constant
  - phase: 06-trip-scheduling (06-02)
    provides: Trip-staff entity, TripStaffWithDetails type, STAFF_SELECT constant
provides:
  - Trip Calendar page at /trips/calendar with monthly grid view
  - My Schedule page at /my-schedule with employee assigned trips
  - fetchTripsByDateRange API for date-range trip queries
  - fetchMySchedule API with PGRST116-safe employee lookup
affects: phase 08 (dashboard readiness)

# Tech tracking
tech-stack:
  added: []
  patterns: calendar grid with dayjs, PGRST116 error handling, role badge display

key-files:
  created:
    - src/pages/trip-calendar/ui/calendar-grid.tsx
    - src/pages/trip-calendar/ui/calendar-page.tsx
    - src/pages/trip-calendar/index.ts
    - src/pages/my-schedule/ui/my-schedule-page.tsx
    - src/pages/my-schedule/index.ts
  modified:
    - src/entities/trip/api/trip.api.ts
    - src/entities/trip/api/trip.queries.ts
    - src/entities/trip/index.ts
    - src/entities/trip-staff/api/trip-staff.api.ts
    - src/entities/trip-staff/api/trip-staff.queries.ts
    - src/entities/trip-staff/index.ts
    - src/entities/trip-staff/model/types.ts
    - src/app/lib/router.tsx
    - src/app/layouts/app-layout/ui/sidebar.tsx

key-decisions:
  - "PGRST116 handling: Return empty array for non-employee users instead of throwing"
  - "Client-side sort for fetchMySchedule: PostgREST nested join ordering unreliable"
  - "Full-date grouping for calendar cells: Use YYYY-MM-DD string comparison, not day-number"
  - "Sidebar exact matching: Added end: true to Trips/Trip Calendar/My Schedule items"

patterns-established:
  - "Calendar grid pattern: dayjs + CSS grid with Vietnamese day headers"
  - "Auth-expiry error pattern: Check status 401/403 or code PGRST301 for Vietnamese message"
  - "Empty state pattern: Show informational message for non-employee users"

# Metrics
duration: ~30min
started: 2026-04-16T10:00:00Z
completed: 2026-04-16T10:30:00Z
---

# Phase 6 Plan 3: Calendar View & My Schedule Summary

**Built monthly calendar trip view and employee schedule page with dayjs grid, PGRST116-safe employee lookup, and auth-expiry error handling.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-04-16 |
| Completed | 2026-04-16 |
| Tasks | 3 completed (2 auto + 1 checkpoint) |
| Files modified | 13 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Calendar Date-Range API | Pass | fetchTripsByDateRange returns trips with route/vehicle details, ordered by departure_time |
| AC-2: Calendar Monthly View | Pass | Monthly grid with day cells, trip cards (route, time, status, vehicle), month navigation, today highlight |
| AC-3: My Schedule API | Pass | fetchMySchedule returns assigned trips with PGRST116 handling for non-employees |
| AC-4: My Schedule Page | Pass | Card view with route, times, vehicle, status, role badge; upcoming/past split |
| AC-5: Router Wiring | Pass | Both placeholder routes replaced with real pages |
| AC-6: Loading and Error States | Pass | Skeleton placeholders, error retry, Vietnamese auth-expiry message (401/403/PGRST301) |

## Accomplishments

- **Trip Calendar page**: Monthly grid view using dayjs + CSS grid, Vietnamese day headers (CN, T2–T7), today cell highlight, trip cards with status-based left border colors
- **My Schedule page**: Employee assigned trips split into upcoming/past sections, role badges ("Tài xế" / "Phụ xe"), non-employee user informational message
- **PGRST116-safe employee lookup**: fetchMySchedule returns empty array for users without employee records instead of crashing
- **Auth-expiry error handling**: Both pages show "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." for 401/403/PGRST301 errors
- **Sidebar active state fix**: Added `end: true` to Trips/Trip Calendar/My Schedule nav items to prevent false positives

## Task Commits

| Task | Type | Description |
|------|------|-------------|
| Task 1: Trip Calendar page | feat | fetchTripsByDateRange API, CalendarGrid component, CalendarPage with navigation |
| Task 2: My Schedule page | feat | fetchMySchedule API with PGRST116 handling, ScheduleItem type, MySchedulePage with upcoming/past split |
| Bug: Sidebar active state | fix | Added end: true to Trips/Trip Calendar/My Schedule nav items |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/trip/api/trip.api.ts` | Modified | Added fetchTripsByDateRange function |
| `src/entities/trip/api/trip.queries.ts` | Modified | Added useTripsByDateRange hook |
| `src/entities/trip/index.ts` | Modified | Exported useTripsByDateRange |
| `src/entities/trip-staff/api/trip-staff.api.ts` | Modified | Added fetchMySchedule with PGRST116 handling |
| `src/entities/trip-staff/api/trip-staff.queries.ts` | Modified | Added useMySchedule hook |
| `src/entities/trip-staff/model/types.ts` | Modified | Added ScheduleItem interface |
| `src/entities/trip-staff/index.ts` | Modified | Exported useMySchedule and ScheduleItem |
| `src/pages/trip-calendar/ui/calendar-grid.tsx` | Created | Monthly calendar grid with dayjs, trip cards, today highlight |
| `src/pages/trip-calendar/ui/calendar-page.tsx` | Created | Calendar page with month navigation, loading/error states |
| `src/pages/trip-calendar/index.ts` | Created | Page barrel export |
| `src/pages/my-schedule/ui/my-schedule-page.tsx` | Created | My schedule page with upcoming/past split, role badges |
| `src/pages/my-schedule/index.ts` | Created | Page barrel export |
| `src/app/lib/router.tsx` | Modified | Wired CalendarPage and MySchedulePage routes |
| `src/app/layouts/app-layout/ui/sidebar.tsx` | Modified | Added end: true to Trips/Trip Calendar/My Schedule items |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| PGRST116 returns empty array | Non-employee users (admin, etc.) shouldn't crash the page | My Schedule gracefully handles all user types |
| Client-side sort for schedule | PostgREST nested join ordering is unreliable | Consistent departure_time ordering guaranteed |
| Full-date grouping for calendar | Using `.date()` day-number comparison fails across month boundaries | Trips correctly grouped by actual date |
| Sidebar exact matching | `/trips/calendar` was matching both Trips and Trip Calendar items | Clean single-item highlighting |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential UX fix |

### Auto-fixed Issues

**1. Sidebar active state false positive**
- **Found during:** Human-verify checkpoint
- **Issue:** When navigating to `/trips/calendar`, both "Trips" and "Trip Calendar" sidebar items were highlighted
- **Root cause:** `Trips` nav item used `startsWith('/trips')` matching without `end: true`
- **Fix:** Added `end: true` to Trips, Trip Calendar, and My Schedule nav items for consistent exact matching
- **Files:** `src/app/layouts/app-layout/ui/sidebar.tsx`
- **Verification:** User confirmed fix works correctly
- **Impact:** None — this was outside the plan scope but essential for UX

### Deferred Items

None — all audit findings from 06-03-AUDIT.md were implemented:
- PGRST116 catch for employee `.single()` ✓
- Auth-expiry 401/403/PGRST301 handling ✓
- Today cell highlight in calendar grid ✓
- Full-date grouping instead of day-number-only ✓
- Client-side sort for fetchMySchedule ✓

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| TypeScript error: Property 'status' does not exist on type 'PostgrestError' | Removed manual status assignment (PostgrestError doesn't have status property), used (error as any).status in UI checks |
| Unused imports (CardHeader, CardTitle, monthDisplay) | Removed unused imports and variables |

## Next Phase Readiness

**Ready:**
- Phase 6 (Trip Scheduling) complete with Trip CRUD, Staff Assignment, and Calendar/Schedule views
- Dashboard ready for Phase 8 with trip calendar integration point
- All placeholder routes replaced with functional pages

**Concerns:**
- None

**Blockers:**
- None

---

*Skill audit: All required skills invoked (/frontend-design ✓, /feature-sliced-design ✓)*

---
*Phase: 06-trip-scheduling, Plan: 03*
*Completed: 2026-04-16*
