---
phase: 03-vehicle-management
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase, zod, fsd, crud, vehicles]

requires:
  - phase: 03-01
    provides: useVehicleTypes hook + @entities/vehicle-type public API for FK dropdown

provides:
  - "@entities/vehicle public API: Vehicle, VehicleWithType types + CRUD hooks"
  - "Vehicles list page with status filter, license plate search, paginated DataTable"
  - "VehicleFormDialog with FK dropdown, date cross-validation, uppercase normalization"
  - "VehicleDeleteDialog with FK RESTRICT error mapping"
  - "VehicleStatusBadge component (active/maintenance/retired)"
  - "mapSupabaseError with 401/403/PGRST301 + 23505/23503/23514/22007 coverage"
  - "serializeToInsert helper centralizing null coercion"

affects: [03-03-maintenance-logs, phase-6-trips]

tech-stack:
  added: []
  patterns:
    - "FK dropdown with FK_DROPDOWN_PAGE_SIZE=1000 + truncation warning when count > data.length"
    - "serializeToInsert helper centralizes null coercion outside submit handler"
    - "mapSupabaseError extended to status codes (401/403) beyond just error.code"
    - "superRefine for cross-field + runtime-dependent validation (year upper bound, date ordering)"
    - "onOpenChange guard while isPending — Escape/backdrop/Cancel no-op during in-flight mutation"
    - "isError error state with retry button — empty table NOT rendered on query failure"

key-files:
  created:
    - src/entities/vehicle/model/types.ts
    - src/entities/vehicle/api/vehicle.api.ts
    - src/entities/vehicle/api/vehicle.queries.ts
    - src/entities/vehicle/index.ts
    - src/pages/vehicles/model/vehicle-form-schema.ts
    - src/pages/vehicles/ui/vehicle-status-badge.tsx
    - src/pages/vehicles/ui/vehicles-page.tsx
    - src/pages/vehicles/ui/vehicle-form-dialog.tsx
    - src/pages/vehicles/ui/vehicle-delete-dialog.tsx
    - src/pages/vehicles/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "license_plate normalized to uppercase via Zod .transform() — matches DB case-sensitive UNIQUE index"
  - "vin_number blank/whitespace coerced to null via serializeToInsert — prevents '' insert into UNIQUE column"
  - "year upper bound evaluated at validation time via superRefine — not module load (avoids staleness)"
  - "DATE_REGEX shared constant for all date fields — maps 22007 PG error to Vietnamese message"

patterns-established:
  - "FK dropdown: useVehicleTypes({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE }) + truncation guard"
  - "serializeToInsert helper: centralizes '' → null coercion for all nullable fields"
  - "mapSupabaseError: check status codes first (401/403), then error.code switch"
  - "superRefine cross-field validation: year upper bound + maintenance date ordering"
  - "Dialog close guard: onOpenChange ignores close attempts when isPending"

duration: ~60min
started: 2026-04-14T00:00:00Z
completed: 2026-04-14T23:00:00Z
---

# Phase 3 Plan 02: Vehicles CRUD — Summary

**Full Vehicles CRUD with entity layer, list page (status filter + debounced search), form dialog (FK dropdown to vehicle_types, date cross-validation, uppercase normalization), delete dialog (FK RESTRICT mapping), VehicleStatusBadge, and router wired — all ACs passing.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~60 min |
| Started | 2026-04-14 |
| Completed | 2026-04-14 |
| Tasks | 2 auto + 1 human-verify checkpoint |
| Files created | 10 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Vehicles List Page | Pass | Paginated DataTable with FK join, status filter, debounced search, 8 columns |
| AC-2: Create Vehicle | Pass | FK dropdown populated, all fields, uppercase plate, success toast |
| AC-3: Edit Vehicle | Pass | Pre-fill with null→'' serialization, success toast |
| AC-4: Delete Vehicle | Pass | Confirmation dialog, FK RESTRICT error mapped to Vietnamese |
| AC-5: Form Validation | Pass | Vietnamese Zod messages, cross-field date ordering, runtime year upper bound |
| AC-6: Uniqueness Error Mapping | Pass | license_plate vs vin_number produce distinct messages via message inspection |
| AC-7: Supabase Error Mapping | Pass | No raw PG strings; 22007 date error mapped; 401/403/PGRST301 auth-expiry mapped |
| AC-8: Status Column Rendering | Pass | VehicleStatusBadge: green/amber/secondary with Vietnamese labels |
| AC-9: List Fetch Error State | Pass | isError → inline error block + refetch() retry button; empty table not rendered |
| AC-10: Dialog Close Guard | Pass | onOpenChange guards against close while isPending for both form and delete dialogs |

## Accomplishments

- Entity layer (`@entities/vehicle`) complete and reusable — 03-03 maintenance logs and Phase 6 trips can import `useVehicles` for FK dropdowns
- `mapSupabaseError` extended beyond vehicle-types pattern: adds status code checks (401/403/PGRST301) and 22007 date format error
- `superRefine` cross-field validation handles two rules: year upper bound (computed at validation time) and maintenance date ordering (next ≥ last)
- FK dropdown guard prevents silent truncation: shows visible warning when `count > data.length`
- Dialog close guard (AC-10) pattern established — prevents mid-flight cancellation on all dialogs

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/vehicle/model/types.ts` | Created | Vehicle, VehicleWithType, VehicleInsert, VehicleUpdate, VehicleListParams, VehicleStatus, VEHICLE_STATUSES |
| `src/entities/vehicle/api/vehicle.api.ts` | Created | 5 Supabase API functions, FK join on fetchVehicles, throw-on-error |
| `src/entities/vehicle/api/vehicle.queries.ts` | Created | 5 TanStack Query hooks, all invalidate ['vehicles'] |
| `src/entities/vehicle/index.ts` | Created | Public barrel export |
| `src/entities/index.ts` | Modified | Added `export * from './vehicle'` |
| `src/pages/vehicles/model/vehicle-form-schema.ts` | Created | vehicleFormSchema, mapSupabaseError, serializeToInsert, FK_DROPDOWN_PAGE_SIZE, DATE_REGEX |
| `src/pages/vehicles/ui/vehicle-status-badge.tsx` | Created | VehicleStatusBadge — active/maintenance/retired → Badge variants + Vietnamese labels |
| `src/pages/vehicles/ui/vehicles-page.tsx` | Created | List page, DataTable, status filter Select, debounced search, error state with retry |
| `src/pages/vehicles/ui/vehicle-form-dialog.tsx` | Created | Create/edit dialog, FK dropdown, all fields, close guard, pre-fill |
| `src/pages/vehicles/ui/vehicle-delete-dialog.tsx` | Created | Delete confirmation, FK RESTRICT mapping, close guard |
| `src/pages/vehicles/index.ts` | Created | `export { VehiclesPage }` |
| `src/pages/index.ts` | Modified | Added `export * from './vehicles'` |
| `src/app/lib/router.tsx` | Modified | ROUTES.VEHICLES → `<VehiclesPage />` (replaced placeholder) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| license_plate uppercase via Zod `.transform()` | DB UNIQUE index is case-sensitive; normalize at schema level so validation and payload match | Mixed-case variants "51a-12345" and "51A-12345" correctly collide |
| vin_number blank/whitespace → null via serializeToInsert | Prevents inserting '' into UNIQUE column which would cause spurious conflicts | serializeToInsert helper centralizes null coercion for all nullable fields |
| year upper bound in superRefine | `new Date().getFullYear() + 1` evaluated at validation time, not module load | Avoids year staleness across long-running sessions |
| DATE_REGEX on all date fields | Catches format errors before hitting Supabase; pairs with 22007 error code mapping | Consistent date validation pattern for 03-03 to follow |

## Deviations from Plan

None. Plan executed exactly as specified. All audit-added items (M1, M2, S1–S9) implemented.

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /feature-sliced-design | ✓ | Loaded before APPLY; guided entity slice placement |
| /frontend-design | ✓ | Loaded before APPLY; guided UI component implementation |

## Deferred Items (from audit)

- Optimistic concurrency control (updated_at match) — last-write-wins for now
- `created_by` / `updated_by` audit-trail columns — Phase 2 schema locked; address in future schema-delta plan before GA (**material compliance gap**)
- Status-transition FSM (active→maintenance→retired business rules) — free-form for now
- Vietnamese license-plate format regex — only uppercase+trim normalization applied
- Soft-delete — hard DELETE matches 03-01 pattern
- ARIA accessibility (dialogs, dropdowns) — deferred (tracked in STATE.md Deferred Issues)
- E2E tests — deferred

## Next Phase Readiness

**Ready:**
- `@entities/vehicle` public API available for 03-03 maintenance logs (uses `useVehicles` for vehicle FK dropdown)
- Entity+page pattern fully established — 03-03 follows same template
- `mapSupabaseError` pattern documented in SUMMARY for copy-forward
- `serializeToInsert` pattern documented for copy-forward

**Concerns:**
- `created_by` / `updated_by` columns missing from vehicles table — material audit-trail gap; flag for schema-delta plan before GA

**Blockers:** None

---
*Phase: 03-vehicle-management, Plan: 02*
*Completed: 2026-04-14*
