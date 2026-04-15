---
phase: 04-route-station-management
plan: 03
subsystem: ui
tags: [react, dnd-kit, tanstack-query, supabase, zod, react-hook-form, fsd]

requires:
  - phase: 04-01
    provides: Station entity slice (@entities/station, useStations)
  - phase: 04-02
    provides: Route entity slice (@entities/route, Route type), routes-page.tsx scaffold

provides:
  - "@entities/route-stop entity slice (useRouteStops, useSaveRouteStops)"
  - "Route Stops Editor Dialog with @dnd-kit drag-and-drop reorder"
  - "Bulk-replace save strategy (DELETE then INSERT) for route stops"
affects: [phase-06-trip-scheduling]

tech-stack:
  added: []
  patterns:
    - "Composite PK entity slice — no id column; dndId derived as 'route_id:station_id'"
    - "hasInitializedRef guard — prevents TanStack Query background refetch from overwriting unsaved local state"
    - "Module-level SortableStopRow — avoids DnD breakage from local function component re-creation"
    - "z.preprocess for optional numeric fields — converts '' → null before z.coerce.number()"

key-files:
  created:
    - src/entities/route-stop/model/types.ts
    - src/entities/route-stop/api/route-stop.api.ts
    - src/entities/route-stop/api/route-stop.queries.ts
    - src/entities/route-stop/index.ts
    - src/pages/routes/model/route-stop-schema.ts
    - src/pages/routes/ui/route-stops-dialog.tsx
  modified:
    - src/pages/routes/ui/routes-page.tsx

key-decisions:
  - "dndId uses composite string 'route_id:station_id' for DB stops — route_stops has no id column"
  - "estimated_arrival column (not arrival_time) — matched to actual migration schema"
  - "distance_from_origin removed — not present in DB schema"
  - "Save strategy: non-atomic DELETE then INSERT (acceptable for MVP; errors surface to user for retry)"

patterns-established:
  - "hasInitializedRef pattern for dialog local state that must not be overwritten by background refetches"
  - "Module-level component definition required for any component using useSortable inside a list"

duration: ~45min
started: 2026-04-15T10:30:00Z
completed: 2026-04-15T12:00:00Z
---

# Phase 4 Plan 03: Route Stops Editor Summary

**Route Stops Dialog with @dnd-kit drag-and-drop reorder, bulk-replace save, and @entities/route-stop entity slice backed by Supabase `route_stops` table.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Started | 2026-04-15 |
| Completed | 2026-04-15 |
| Tasks | 3 completed |
| Files created | 6 |
| Files modified | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Entity Slice Public API | Pass | Exports: RouteStop, RouteStopInsert, useRouteStops, useSaveRouteStops |
| AC-2: Dialog Opens with Correct Stop Layout | Pass | Title "Điểm dừng — [Name]", locked origin/destination rows |
| AC-3: Drag-and-Drop Reorder | Pass | @dnd-kit PointerSensor + KeyboardSensor, arrayMove on drop |
| AC-4: Add Intermediate Stop | Pass | Inline form; dropdown excludes origin, destination, already-added stations |
| AC-5: Remove Intermediate Stop | Pass | × button removes from local state; not persisted until Save |
| AC-6: Save Stops (Bulk Replace) | Pass | DELETE + INSERT; toast "Đã lưu điểm dừng"; close guard on isPending |
| AC-7: Error Mapping | Pass | 23505/23503/23514/401/403/PGRST301/save-context all mapped |

## Accomplishments

- Built `@entities/route-stop` slice following established FSD pattern: types → api → queries → index
- Implemented Route Stops Editor Dialog with `@dnd-kit` drag-and-drop, keyboard DnD support, and module-level `SortableStopRow` to prevent React remount on every render
- Added `hasInitializedRef` guard to protect local editor state from TanStack Query background refetch race condition
- Wired "Điểm dừng" action into the Routes page row dropdown (Sửa | Điểm dừng | Xóa)
- Phase 4 complete: Stations + Routes + Route Stops all delivered

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /feature-sliced-design | ✓ | Loaded at session start (confirmed in plan) |
| /frontend-design | ✓ | Loaded at session start (confirmed in plan) |

All required skills invoked ✓

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/route-stop/model/types.ts` | Created | RouteStop, RouteStopInsert interfaces (composite PK, estimated_arrival) |
| `src/entities/route-stop/api/route-stop.api.ts` | Created | fetchRouteStops, saveRouteStops (bulk-replace) |
| `src/entities/route-stop/api/route-stop.queries.ts` | Created | useRouteStops, useSaveRouteStops hooks |
| `src/entities/route-stop/index.ts` | Created | Public API barrel |
| `src/pages/routes/model/route-stop-schema.ts` | Created | addStopFormSchema, mapRouteStopError, parseIntervalToMinutes, minutesToInterval |
| `src/pages/routes/ui/route-stops-dialog.tsx` | Created | Full stops editor dialog with DnD, add/remove/save |
| `src/pages/routes/ui/routes-page.tsx` | Modified | Added stopsOpen state, "Điểm dừng" menu item, RouteStopsDialog mount |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `dndId: \`${route_id}:${station_id}\`` for DB stops | `route_stops` has composite PK — no `id` column exists | Phase 6 consumers must derive stop identity from (route_id, station_id) |
| Non-atomic save (DELETE then INSERT) | Acceptable for MVP; partial failure shows error to user who can retry | Risk noted in mapRouteStopError 'save' context message |
| No `distance_from_origin` field | Column not in actual DB migration | Phase 6 can add if needed via schema delta plan |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | Essential corrections to match actual DB schema |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** All deviations were schema-reality fixes, no scope creep.

### Auto-fixed Issues

**1. Column rename: `arrival_time` → `estimated_arrival`**
- **Found during:** Checkpoint (save API call)
- **Issue:** Plan spec used `arrival_time`; actual migration column is `estimated_arrival`
- **Fix:** Renamed in `types.ts`, `route-stops-dialog.tsx` (SELECT, insert payload, useEffect init)
- **Files:** `src/entities/route-stop/model/types.ts`, `src/pages/routes/ui/route-stops-dialog.tsx`
- **Verification:** Save API call succeeded; tsc + build clean

**2. No `id` column → composite `dndId`**
- **Found during:** Checkpoint (React key warning in console)
- **Issue:** Plan assumed `s.id` for `dndId`; `route_stops` uses composite PK `(route_id, station_id)` with no `id` column — `s.id` was `undefined`, causing React key warning and unstable list rendering
- **Fix:** DB-loaded stops use `dndId: \`${s.route_id}:${s.station_id}\``; new stops continue to use `crypto.randomUUID()`
- **Files:** `src/pages/routes/ui/route-stops-dialog.tsx`
- **Verification:** No React key warnings; drag-and-drop stable

**3. `distance_from_origin` column not in DB**
- **Found during:** Schema investigation after PGRST204 error
- **Issue:** Plan included `distance_from_origin` in types and form; column does not exist in `route_stops` migration
- **Fix:** Removed from `types.ts`, `route-stop-schema.ts`, and `route-stops-dialog.tsx`
- **Files:** `src/entities/route-stop/model/types.ts`, `src/pages/routes/model/route-stop-schema.ts`, `src/pages/routes/ui/route-stops-dialog.tsx`
- **Verification:** Save API call succeeded after fix

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| PGRST204: `arrival_time` column not found | Renamed to `estimated_arrival` to match actual migration |
| PGRST204 risk: `distance_from_origin` not found | Removed field entirely; not in DB schema |
| React key warning: all keys were `undefined` | Route stops use composite PK; switched dndId derivation |

## Next Phase Readiness

**Ready:**
- `@entities/route-stop` available for Phase 6 (trip scheduling) to query stops per route
- Route stop ordering established via `stop_order` 1..N
- `estimated_arrival` interval stored; Phase 6 can compute departure times per stop
- All Phase 4 entities complete: stations, routes, route_stops

**Concerns:**
- Save is non-atomic (DELETE + INSERT). If INSERT fails after DELETE, stops are wiped. User sees error and can retry, but data loss window exists. Phase 7 or a schema-delta plan should consider wrapping in a Postgres function for atomicity.
- `distance_from_origin` not stored — if Phase 6 or later needs it, requires a schema delta migration

**Blockers:** None

---
*Phase: 04-route-station-management, Plan: 03*
*Completed: 2026-04-15*
