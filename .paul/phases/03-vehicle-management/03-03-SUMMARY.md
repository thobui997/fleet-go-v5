---
phase: 03-vehicle-management
plan: 03
subsystem: ui
tags: [react, tanstack-query, supabase, zod, fsd, maintenance-logs, crud]

requires:
  - phase: 03-02
    provides: "@entities/vehicle entity slice — useVehicles hook for FK dropdown in maintenance form"
  - phase: 02-database-foundation
    provides: "maintenance_logs table with RLS, FK to vehicles, CASCADE delete"

provides:
  - "@entities/maintenance-log entity slice (types, API, queries, barrel)"
  - "Maintenance Logs CRUD — list page with vehicle/type filters, form dialog, delete dialog"
  - "MaintenanceTypeBadge component (routine/repair/inspection/emergency)"
  - "Router wired: ROUTES.MAINTENANCE → MaintenancePage"

affects: [phase 7 dashboard, reporting, fleet health visibility]

tech-stack:
  added: []
  patterns:
    - "FK dropdown for cross-entity selection (vehicles dropdown in maintenance form)"
    - "Cross-entity type composition: MaintenanceLogWithVehicle = MaintenanceLog & { vehicle: Pick<Vehicle> | null }"
    - "serializeToInsert: cost '' → 0 (DB DEFAULT contract), nullable fields '' → null"
    - "23503 error context: INSERT FK violation only (CASCADE means 23503 never fires on delete)"

key-files:
  created:
    - src/entities/maintenance-log/model/types.ts
    - src/entities/maintenance-log/api/maintenance-log.api.ts
    - src/entities/maintenance-log/api/maintenance-log.queries.ts
    - src/entities/maintenance-log/index.ts
    - src/pages/maintenance/model/maintenance-form-schema.ts
    - src/pages/maintenance/ui/maintenance-type-badge.tsx
    - src/pages/maintenance/ui/maintenance-page.tsx
    - src/pages/maintenance/ui/maintenance-form-dialog.tsx
    - src/pages/maintenance/ui/maintenance-delete-dialog.tsx
    - src/pages/maintenance/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "cost typed as number (not string) — Supabase returns numeric(12,2) as JS number; toLocaleString requires number"
  - "FK_DROPDOWN_PAGE_SIZE = 1000 defined locally — no cross-page coupling with vehicle-form-schema"
  - "23503 message = INSERT FK violation only — CASCADE delete means 23503 cannot occur on maintenance_logs delete"

patterns-established:
  - "FK join select: vehicle:vehicles(id, license_plate) — returns vehicle field on MaintenanceLogWithVehicle"
  - "cost coercion: values.cost === undefined || values.cost === '' ? 0 : Number(values.cost)"

duration: ~45min
started: 2026-04-14T23:30:00Z
completed: 2026-04-14T23:59:00Z
---

# Phase 3 Plan 03: Maintenance Logs CRUD Summary

**Full maintenance logs CRUD with entity slice, paginated list (vehicle/type filters), form dialog (FK dropdown, type select, cost, dates, odometer), delete dialog, type badge, and router wiring — Phase 3 complete.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 min |
| Started | 2026-04-14T23:30:00Z |
| Completed | 2026-04-14T23:59:00Z |
| Tasks | 1 auto + 1 checkpoint |
| Files modified | 13 (10 created, 3 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: List page with DataTable | Pass | 8 columns: Vehicle, Type, Description, Cost (VND), Performed By, Performed At, Next Due Date, Actions |
| AC-2: Vehicle filter | Pass | FK dropdown → vehicleId param, "Tất cả xe" clears |
| AC-3: Type filter | Pass | MAINTENANCE_TYPES Select → type param, "Tất cả loại" clears |
| AC-4: Create log | Pass | Form dialog, all fields, success toast "Đã tạo lịch bảo trì" |
| AC-5: Edit log | Pass | Pre-fill null → '', update mutation, success toast "Đã cập nhật lịch bảo trì" |
| AC-6: Delete log | Pass | Confirm dialog, success toast "Đã xóa lịch bảo trì" |
| AC-7: Form validation | Pass | Vietnamese messages; uuid required, type enum, description min 1, cost ≥0, odometer ≥0, DATE_REGEX, cross-field superRefine |
| AC-8: Supabase error mapping | Pass | 23514 → CHECK violation; 23503 → "Xe không tồn tại hoặc đã bị xóa" (INSERT FK); 401/403/PGRST301 → session expired |
| AC-9: Type badge | Pass | 4 variants (default/secondary/outline/destructive) with Vietnamese labels |
| AC-10: Error state with retry | Pass | isError → AlertCircle + "Thử lại" button + refetch() |
| AC-11: Dialog close guard | Pass | onOpenChange ignores close when isPending |

## Accomplishments

- Complete `@entities/maintenance-log` entity slice — 5 CRUD hooks, FK join type, typed params
- Maintenance page with dual filters (vehicle + type), paginated DataTable, inline error state
- Form dialog with vehicle FK dropdown + truncation warning, type select, all 8 fields, today default for performed_at
- `mapSupabaseError` correctly distinguishes 23503 as INSERT FK violation (not delete restriction) per CASCADE semantics

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/maintenance-log/model/types.ts` | Created | MaintenanceType, MAINTENANCE_TYPES, MaintenanceLog, MaintenanceLogWithVehicle, Insert/Update/ListParams |
| `src/entities/maintenance-log/api/maintenance-log.api.ts` | Created | 5 CRUD functions, FK join, pagination, filters |
| `src/entities/maintenance-log/api/maintenance-log.queries.ts` | Created | 5 TanStack Query hooks |
| `src/entities/maintenance-log/index.ts` | Created | Barrel export |
| `src/pages/maintenance/model/maintenance-form-schema.ts` | Created | Zod schema, mapSupabaseError, serializeToInsert, FK_DROPDOWN_PAGE_SIZE |
| `src/pages/maintenance/ui/maintenance-type-badge.tsx` | Created | 4-type badge with variant map |
| `src/pages/maintenance/ui/maintenance-page.tsx` | Created | List page with dual filters, DataTable, error state |
| `src/pages/maintenance/ui/maintenance-form-dialog.tsx` | Created | Create/edit form with FK dropdown and close guard |
| `src/pages/maintenance/ui/maintenance-delete-dialog.tsx` | Created | Delete confirm with close guard |
| `src/pages/maintenance/index.ts` | Created | Page barrel |
| `src/entities/index.ts` | Modified | Added `export * from './maintenance-log'` |
| `src/pages/index.ts` | Modified | Added `export { MaintenancePage } from './maintenance'` |
| `src/app/lib/router.tsx` | Modified | Replaced PlaceholderPage with MaintenancePage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `cost: number` in MaintenanceLog | Supabase returns numeric(12,2) as JS number; `.toLocaleString` requires number | Correct type safety, no cast needed in DataTable |
| FK_DROPDOWN_PAGE_SIZE local constant | Avoid cross-page coupling — each page slice owns its own constant | Cleaner FSD boundaries |
| 23503 → INSERT FK message only | CASCADE on vehicle_id means delete never triggers 23503 on maintenance_logs; 23503 can only come from INSERT with non-existent vehicle_id | Accurate error messaging; no misleading "vehicle in use" language |
| cost `''` → `0` (not null) | DB has `DEFAULT 0, CHECK >= 0`; explicit NULL bypasses DEFAULT | Respects DB contract |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Zero scope impact |
| Scope additions | 0 | — |
| Deferred | 0 | — |

**Total impact:** One qualifying fix, no scope creep.

### Auto-fixed Issues

**1. TypeScript TS2367 in `serializeToInsert`**
- **Found during:** QUALIFY step (npm run build)
- **Issue:** `!values.cost || values.cost === ''` — after `!values.cost` narrows type to `number`, comparing `number === ''` triggers TS2367
- **Fix:** Changed to `values.cost === undefined || values.cost === ''` — explicit checks, no narrowing conflict
- **Files:** `src/pages/maintenance/model/maintenance-form-schema.ts`
- **Verification:** `npm run build` passed cleanly after fix

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `tsc --noEmit` passed but `tsc -b` (build mode) caught TS2367 | Fixed in qualify loop before marking task complete |

## Next Phase Readiness

**Ready:**
- Phase 3 complete: Vehicle Types, Vehicles, Maintenance Logs all fully operational
- `@entities/maintenance-log` public API available for any future phase
- FSD entity+page pattern fully established across 3 feature areas
- All 3 entities follow identical structure: model/types → api/[name].api → api/[name].queries → index.ts

**Concerns:**
- No `created_by`/`updated_by` audit columns on maintenance_logs (schema locked in Phase 2; flagged in STATE.md decisions as residual compliance gap)

**Blockers:**
- None

---
*Phase: 03-vehicle-management, Plan: 03*
*Completed: 2026-04-14*
