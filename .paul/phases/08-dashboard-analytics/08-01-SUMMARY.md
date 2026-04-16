---
phase: 08-dashboard-analytics
plan: 01
subsystem: ui, api
tags: dashboard, kpi, stats, tanstack-query, supabase, aggregation, error-handling

# Dependency graph
requires:
  - phase: 07-customer-ticketing-payment
    provides: bookings, trips, payments, customers entities with full CRUD
provides:
  - dashboard page with KPI stat cards
  - dashboard API layer with aggregation queries
  - recent bookings and upcoming trips quick views
affects: [08-02-charts-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Promise.allSettled for partial failure tolerance in dashboard stats
    - Auth-expiry detection (PGRST301/401/403) with signOut trigger
    - Error boundaries per data section (stat cards, bookings, trips)

key-files:
  created:
    - src/pages/dashboard/model/types.ts
    - src/pages/dashboard/api/dashboard.api.ts
    - src/pages/dashboard/api/dashboard.queries.ts
    - src/pages/dashboard/ui/stat-card.tsx
    - src/pages/dashboard/ui/dashboard-page.tsx
    - src/pages/dashboard/index.ts
  modified:
    - src/app/lib/router.tsx

key-decisions:
  - "Promise.allSettled: Use instead of Promise.all for fetchDashboardStats to prevent one failing query from breaking all stat cards"
  - "Error states per section: Each dashboard section handles loading/error/empty states independently"

patterns-established:
  - "Dashboard page structure: stat cards row + quick views grid"
  - "Stat card component with loading skeleton, error message, and retry button"
  - "Inline status badge helpers using Tailwind color mapping"
  - "Auth-expiry handling in API functions with PGRST301 detection"

# Metrics
duration: ~15min
started: 2026-04-16T23:40:00Z
completed: 2026-04-16T23:55:00Z
---

# Phase 8 Plan 01: Dashboard Page Summary

**Dashboard landing page with 4 KPI stat cards (vehicles, trips, bookings, revenue) and 2 quick-view tables (recent bookings, upcoming trips), replacing placeholder route.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~15 minutes |
| Started | 2026-04-16T23:40:00Z |
| Completed | 2026-04-16T23:55:00Z |
| Tasks | 2 completed |
| Files created | 6 |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Stat cards display live KPI data | Pass | 4 stat cards (Tổng xe, Chuyến hôm nay, Đặt vé hôm nay, Doanh thu hôm nay) with icons, loading skeletons, value/subtitle display |
| AC-1b: Stat cards show error state | Pass | "Không thể tải dữ liệu" message with "Thử lại" retry button |
| AC-2: Recent bookings quick view | Pass | Table showing 5 most recent bookings with booking_code, customer, route, departure time, total_amount, status badge |
| AC-2b: Recent bookings error state | Pass | Error state with AlertCircle icon, retry button |
| AC-3: Upcoming trips quick view | Pass | List showing 5 upcoming trips with route, departure time, vehicle license_plate, status badge |
| AC-3b: Upcoming trips error state | Pass | Error state with AlertCircle icon, retry button |
| AC-4: Dashboard replaces placeholder route | Pass | Router updated, DashboardPage imported and wired to /dashboard |
| AC-5: Build passes with zero errors | Pass | `npm run build` completes successfully, 1,015.47 kB bundle |

## Accomplishments

- **Dashboard API layer with resilient aggregation**: fetchDashboardStats uses Promise.allSettled so partial failures don't break the entire dashboard
- **Complete error handling**: All three data sections (stats, bookings, trips) handle loading, error, and empty states with appropriate UI feedback
- **Auth-expiry detection**: All API functions detect PGRST301/401/403 errors and trigger signOut for re-login
- **Stat card component**: Reusable StatCard with loading skeleton, error message, and retry button
- **Inline status badges**: Helper functions for booking and trip status badges using Tailwind color mapping (avoids cross-entity imports)

## Task Commits

| Task | Description | Status |
|------|-------------|--------|
| Task 1: Create dashboard API layer | Created dashboard types, API functions with aggregation queries, TanStack Query hooks | DONE |
| Task 2: Build dashboard page UI | Created StatCard component, DashboardPage with stat cards and quick views, updated router | DONE |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/dashboard/model/types.ts` | Created | Dashboard-specific types (DashboardStats, RecentBooking, UpcomingTrip) |
| `src/pages/dashboard/api/dashboard.api.ts` | Created | Aggregation queries using Supabase, Promise.allSettled for resilience, auth-expiry handling |
| `src/pages/dashboard/api/dashboard.queries.ts` | Created | TanStack Query hooks (useDashboardStats, useRecentBookings, useUpcomingTrips) |
| `src/pages/dashboard/ui/stat-card.tsx` | Created | Reusable stat card component with loading, error, retry states |
| `src/pages/dashboard/ui/dashboard-page.tsx` | Created | Main dashboard page with 4 stat cards and 2 quick-view tables |
| `src/pages/dashboard/index.ts` | Created | Public API export (DashboardPage) |
| `src/app/lib/router.tsx` | Modified | Imported DashboardPage, replaced placeholder div, removed "// Placeholder routes" comment |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minor cleanup |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Essential cleanup, no scope creep

### Auto-fixed Issues

**1. TypeScript unused import**
- **Found during:** Task 2 (build verification)
- **Issue:** `Loader2` imported from lucide-react but never used in dashboard-page.tsx
- **Fix:** Removed unused import
- **Files:** `src/pages/dashboard/ui/dashboard-page.tsx`
- **Verification:** Build passed with zero errors

**2. TypeScript unused function**
- **Found during:** Task 1 (build verification)
- **Issue:** `handleAuthExpiry` function declared in dashboard.queries.ts but never used (auth handling is in API layer, not query hooks)
- **Fix:** Removed unused function from dashboard.queries.ts
- **Files:** `src/pages/dashboard/api/dashboard.queries.ts`
- **Verification:** Build passed after StatCard component creation

## Issues Encountered

None. All tasks executed as planned with no blocking issues.

## Key Patterns/Decisions

**Promise.allSettled for Dashboard Stats**
- Decision: Use Promise.allSettled instead of Promise.all for fetchDashboardStats
- Rationale: Prevents one failing query from breaking all stat cards; each section handles its own error state
- Impact: Dashboard remains partially functional even when one query fails

**Inline Status Badges**
- Decision: Created helper functions (getBookingStatusClasses, getTripStatusClasses) instead of importing from entity pages
- Rationale: Avoids FSD cross-import violations (pages → entities UI is forbidden)
- Impact: Maintains architectural boundaries, reusable pattern for status badges

**Auth-Expiry Detection Pattern**
- Decision: Reused existing pattern from prior plans (handleAuthExpiry with PGRST301/401/403 detection)
- Rationale: Consistent auth-expiry handling across all API functions
- Impact: Users are signed out automatically on auth expiry, no stale state

## Next Phase Readiness

**Ready:**
- Dashboard API layer complete with TanStack Query hooks
- Dashboard page layout established (stat cards row + quick views grid)
- StatCard component reusable for future dashboard extensions
- Error handling pattern established for dashboard sections

**Foundation for Plan 08-02:**
- Dashboard page structure ready for charts integration
- API hooks ready for extension with chart-specific queries
- Stat cards can be augmented with trend indicators

**Concerns:**
- None identified

**Blockers:**
- None

---
*Phase: 08-dashboard-analytics, Plan: 01*
*Completed: 2026-04-16*
