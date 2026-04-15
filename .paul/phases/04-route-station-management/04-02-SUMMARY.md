---
phase: 04-route-station-management
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase, postgrest, zod, react-hook-form, fsd]

requires:
  - phase: 04-01
    provides: "@entities/station public API (useStations, Station types) used for FK dropdowns; Switch component in @shared/ui"
  - phase: 02-03
    provides: "routes DB table with origin_station_id/destination_station_id FK constraints + estimated_duration interval column"

provides:
  - "@entities/route public API: Route, RouteInsert, RouteUpdate, RouteListParams, useRoutes, useRoute, useCreateRoute, useUpdateRoute, useDeleteRoute"
  - "/routes page with full CRUD: name search + is_active filter, DataTable with PostgREST FK-joined station names"
  - "estimated_duration round-trip: DB interval → parseDurationMinutes → form minutes → serializeToInsert → DB interval"
  - "mapSupabaseError with context param ('mutate'|'delete') for 23503 split"

affects: [06-trip-scheduling, 04-03-route-stops]

tech-stack:
  added: []
  patterns:
    - "PostgREST FK join syntax: 'table!constraint_name(fields)' for disambiguation"
    - "parseDurationMinutes: handles both 'HH:MM:SS' and 'X days HH:MM:SS' interval formats"
    - "mapSupabaseError context param: distinguishes INSERT/UPDATE 23503 (missing FK) from DELETE 23503 (FK RESTRICT)"
    - "Two identical useStations calls → single network request via TanStack Query cache deduplication"
    - "serializeToInsert Math.max(1, minutes) clamp before interval conversion"

key-files:
  created:
    - src/entities/route/model/types.ts
    - src/entities/route/api/route.api.ts
    - src/entities/route/api/route.queries.ts
    - src/entities/route/index.ts
    - src/pages/routes/model/route-form-schema.ts
    - src/pages/routes/ui/routes-page.tsx
    - src/pages/routes/ui/route-form-dialog.tsx
    - src/pages/routes/ui/route-delete-dialog.tsx
    - src/pages/routes/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "Route type alias: router.tsx imports only RoutesPage (not Route type) to avoid react-router-dom collision"
  - "parseDurationMinutes fallback=1 (not 0) to prevent '00:00:00' reaching DB CHECK constraint"
  - "mapSupabaseError context param added — 23503 on mutate = missing station FK, 23503 on delete = trip FK RESTRICT"

patterns-established:
  - "FK join select string uses explicit constraint name: stations!routes_origin_station_fk(id,name)"
  - "formatDuration helper: '02:30:00' → '2h 30m'; sub-hour intervals → '45m'"
  - "FK dropdown page size = 1000 constant; two calls with same params = one cached request"

duration: ~45min
started: 2026-04-15T09:00:00Z
completed: 2026-04-15T10:00:00Z
---

# Phase 4 Plan 02: Routes CRUD Summary

**`@entities/route` entity slice + `/routes` list page with PostgREST FK-joined station names, create/edit form dialog with two station FK dropdowns and duration-as-minutes round-trip, delete dialog with trip-RESTRICT error mapping.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Started | 2026-04-15 |
| Completed | 2026-04-15 |
| Tasks | 2 completed |
| Files modified | 11 (9 created, 2 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Routes List Page | Pass | DataTable with Name, Origin, Destination, Distance, Duration, Base Price, Status, Actions; name search (300ms debounce); is_active filter; pagination |
| AC-2: Create Route | Pass | Form dialog with two station FK dropdowns; success toast; route appears in list |
| AC-3: Edit Route | Pass | Pre-fills all fields; `parseDurationMinutes` converts interval → minutes correctly |
| AC-4: Delete Route | Pass | Confirmation dialog; 23503 on delete maps to "Không thể xóa tuyến đường đang được sử dụng bởi chuyến đi" |
| AC-5: Form Validation | Pass | All Vietnamese messages; cross-field origin ≠ destination superRefine; does not submit on error |
| AC-6: Supabase Error Mapping | Pass | 23505 `routes_name_key`, 23503 split by context, 23514, 401/403/PGRST301 all mapped |
| AC-7: List Error State | Pass | AlertCircle + "Thử lại" button; no empty DataTable shown |
| AC-8: Dialog Close Guard | Pass | `if (!nextOpen && isPending) return` in both form and delete dialogs |
| AC-9: Station FK Dropdown Behavior | Pass | Loader2 spinner while loading; AlertTriangle truncation warning when count > data.length; empty message pointing to /stations |

## Accomplishments

- `@entities/route` public API fully available for Phase 6 (Trip Scheduling) — 5 TanStack Query hooks, PostgREST FK joins with station names
- `estimated_duration` interval round-trips correctly: DB "HH:MM:SS"/"X days HH:MM:SS" → minutes in form → "HH:MM:SS" back to DB
- `mapSupabaseError` context parameter pattern established — 23503 split by operation type is reusable for any entity with both mutate and delete FK constraints
- No react-router-dom `Route` type collision in `router.tsx` — only `RoutesPage` component imported

## Skill Audit

All required skills invoked ✓
- `/feature-sliced-design` — loaded before APPLY
- `/frontend-design` — loaded before APPLY

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/route/model/types.ts` | Created | Route, RouteInsert, RouteUpdate, RouteListParams types |
| `src/entities/route/api/route.api.ts` | Created | Supabase CRUD functions with PostgREST FK joins |
| `src/entities/route/api/route.queries.ts` | Created | 5 TanStack Query hooks (useRoutes, useRoute, useCreateRoute, useUpdateRoute, useDeleteRoute) |
| `src/entities/route/index.ts` | Created | Entity public API barrel export |
| `src/entities/index.ts` | Modified | Added `export * from './route'` |
| `src/pages/routes/model/route-form-schema.ts` | Created | Zod schema, mapSupabaseError (with context), parseDurationMinutes, serializeToInsert, FK_DROPDOWN_PAGE_SIZE |
| `src/pages/routes/ui/routes-page.tsx` | Created | List page with DataTable, search, status filter, formatDuration helper |
| `src/pages/routes/ui/route-form-dialog.tsx` | Created | Create/edit form with two station FK dropdowns, duration-as-minutes, is_active Switch Controller |
| `src/pages/routes/ui/route-delete-dialog.tsx` | Created | Delete confirmation with 23503 trip-RESTRICT error mapping |
| `src/pages/routes/index.ts` | Created | Page public API barrel export |
| `src/pages/index.ts` | Modified | Added `export { RoutesPage } from './routes'` |
| `src/app/lib/router.tsx` | Modified | `ROUTES.ROUTES` → `<RoutesPage />`, import RoutesPage only (no Route type) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `parseDurationMinutes` fallback = 1 (not 0) | DB CHECK constraint `routes_duration_positive` rejects "00:00:00" — returning 0 would silently fail on save | Prevents invalid data reaching DB |
| `mapSupabaseError(error, context?)` context param | Both 23503 mutations (missing station FK) and deletes (trip FK RESTRICT) need different Vietnamese messages | Pattern reusable for Phase 6 trips entity which has same FK structure |
| `Math.max(1, minutes)` in `serializeToInsert` | Defense in depth — even if Zod `.positive()` passes an edge case, interval is clamped | Belt-and-suspenders before DB write |
| No `Route` type import in `router.tsx` | react-router-dom exports `Route` component; named import collision causes confusing TS errors | Rule: import only components (not types) from entity slices in router.tsx |
| Two `useStations` calls with identical params | TanStack Query deduplicates by cache key → one network request; explicit separation of origin/dest queries makes intent clear | Zero extra network cost; simpler component logic |

## Deviations from Plan

None — plan executed exactly as specified. All audit-added items (parseDurationMinutes, context param, Math.max clamp, Route type collision note) were pre-baked into the plan.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- `@entities/route` public API available for Phase 6 (Trip Scheduling): `useRoutes`, `useRoute`, `useCreateRoute`, `useUpdateRoute`, `useDeleteRoute`
- Station names display correctly in route list (not raw UUIDs)
- `estimated_duration` round-trip verified working
- `mapSupabaseError` context pattern documented for future entities

**Concerns:**
- None material

**Blockers:**
- None — 04-03 (Route Stops Editor, dnd-kit) can proceed

---
*Phase: 04-route-station-management, Plan: 02*
*Completed: 2026-04-15*
