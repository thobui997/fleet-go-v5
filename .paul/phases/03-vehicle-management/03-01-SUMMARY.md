---
phase: 03-vehicle-management
plan: 01
subsystem: ui
tags: [react, supabase, tanstack-query, zod, react-hook-form, fsd, vehicle-types]

requires:
  - phase: 01-foundation-auth
    provides: shared UI components (DataTable, Dialog, FormFieldWrapper, Badge, useToast), FSD structure, auth system
  - phase: 02-database-foundation
    provides: vehicle_types table, RLS policies (SELECT open/write needs vehicle_types:write/delete needs admin), FK RESTRICT on vehicles

provides:
  - Vehicle Types entity slice (src/entities/vehicle-type/) with types, Supabase API, TanStack Query hooks
  - Vehicle Types list page at /vehicle-types with paginated DataTable, search, sort
  - Create/Edit form dialog with visual seat layout configurator
  - Delete dialog with FK constraint error handling
  - FSD entity+page pattern established as template for 03-02 and 03-03
affects: [03-02-vehicles, 03-03-maintenance-logs, 07-ticketing-payments]

tech-stack:
  added: []
  patterns:
    - Entity slice pattern: model/types.ts + api/[name].api.ts + api/[name].queries.ts + index.ts
    - Supabase API pattern: throw error on failure so TanStack Query onError receives typed error
    - Form mutation pattern: mutateAsync in try/catch — close dialog + success toast only on success
    - Error mapping: mapSupabaseError() centralises 23505/23503 → Vietnamese user messages
    - Visual floor config: floors[] array in form drives total_floors + total_seats + seat_layout on submit

key-files:
  created:
    - src/entities/vehicle-type/model/types.ts
    - src/entities/vehicle-type/api/vehicle-type.api.ts
    - src/entities/vehicle-type/api/vehicle-type.queries.ts
    - src/entities/vehicle-type/index.ts
    - src/pages/vehicle-types/model/vehicle-type-form-schema.ts
    - src/pages/vehicle-types/ui/seat-layout-editor.tsx
    - src/pages/vehicle-types/ui/vehicle-types-page.tsx
    - src/pages/vehicle-types/ui/vehicle-type-form-dialog.tsx
    - src/pages/vehicle-types/ui/vehicle-type-delete-dialog.tsx
    - src/pages/vehicle-types/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "Visual seat editor over JSON textarea: replaced raw JSON input with per-floor rows×seats_per_row configurator + live seat grid preview"
  - "Derived totals: total_floors and total_seats are computed from floors[] array on submit — not separate form inputs"
  - "ColumnDef imported directly from @shared/ui/data-table (not barrel) — barrel doesn't re-export it"
  - "useToast() hook pattern used (not standalone toast import) — consistent with login-page.tsx pattern"

patterns-established:
  - "FSD entity slice: model/types → api/[name].api → api/[name].queries → index.ts public API"
  - "Cell type annotation: use VehicleType[keyof VehicleType] union type for DataTable cell parameters under strict tsc -b"
  - "Mutation flow: mutateAsync in try/catch; close dialog + success toast only after await resolves; error always maps through mapSupabaseError"
  - "Edit pre-fill: serialize object fields back to form types on dialog open (e.g. parse floor_N keys from seat_layout JSON)"

duration: ~2h
started: 2026-04-14T00:00:00Z
completed: 2026-04-14T00:00:00Z
---

# Phase 3 Plan 01: Vehicle Types CRUD Summary

**Vehicle Types first-feature module shipped: FSD entity slice + paginated list page + visual seat layout configurator + full CRUD with mapped error handling.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2h |
| Tasks | 2 auto + 1 checkpoint |
| Files created | 10 |
| Files modified | 3 |
| Build | tsc -b + vite build — clean |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Vehicle Types List Page | Pass | Paginated DataTable, 10/20/50/100 per page, client-side sort, debounced name search |
| AC-2: Create Vehicle Type | Pass | Form dialog, all fields, success toast, list refresh via query invalidation |
| AC-3: Edit Vehicle Type | Pass | Pre-fills from existing record (floors parsed back from seat_layout JSON), update + success toast |
| AC-4: Delete Vehicle Type | Pass | Confirmation dialog, FK RESTRICT (23503) mapped to Vietnamese message |
| AC-5: Form Validation | Pass | Zod schema, Vietnamese error messages, inline via FormFieldWrapper |
| AC-6: Duplicate Name Handling | Pass | 23505 → 'Tên loại xe đã tồn tại'; dialog stays open on error |
| AC-7: Supabase Error Mapping | Pass | mapSupabaseError() covers 23505/23503/default; no raw DB strings exposed |

## Accomplishments

- Established the FSD entity slice pattern used by all subsequent CRUD modules (03-02, 03-03, and beyond)
- Replaced the planned JSON textarea with a visual seat layout editor: per-floor rows×seats_per_row inputs + live seat grid preview with aisle gap rendering
- All mutations correctly handle the await-then-close pattern — dialog stays open during pending state, closes only on success

## Task Commits

No per-task commits were made during this session (commit step not included in plan). All changes are staged for a single phase commit.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/vehicle-type/model/types.ts` | Created | VehicleType, VehicleTypeInsert, VehicleTypeUpdate, VehicleTypeListParams interfaces |
| `src/entities/vehicle-type/api/vehicle-type.api.ts` | Created | Supabase CRUD + paginated list functions; throw on error |
| `src/entities/vehicle-type/api/vehicle-type.queries.ts` | Created | TanStack Query hooks: useVehicleTypes, useVehicleType, useCreate/Update/DeleteVehicleType |
| `src/entities/vehicle-type/index.ts` | Created | Public API barrel for entity slice |
| `src/pages/vehicle-types/model/vehicle-type-form-schema.ts` | Created | Zod schema with floors[] array; mapSupabaseError helper |
| `src/pages/vehicle-types/ui/seat-layout-editor.tsx` | Created | Visual floor configurator: rows+seats_per_row inputs + live SeatGrid preview |
| `src/pages/vehicle-types/ui/vehicle-types-page.tsx` | Created | List page: DataTable, pagination, debounced search, dialog state management |
| `src/pages/vehicle-types/ui/vehicle-type-form-dialog.tsx` | Created | Create/edit dialog with useFieldArray floors, "Add floor"/"Remove floor", derived totals |
| `src/pages/vehicle-types/ui/vehicle-type-delete-dialog.tsx` | Created | Delete confirmation dialog with FK error mapping |
| `src/pages/vehicle-types/index.ts` | Created | Page slice public API |
| `src/entities/index.ts` | Modified | Added re-export from ./vehicle-type |
| `src/pages/index.ts` | Modified | Added re-export from ./vehicle-types |
| `src/app/lib/router.tsx` | Modified | Replaced VEHICLE_TYPES PlaceholderPage with VehicleTypesPage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Visual seat editor replaces JSON textarea | User request: JSON not user-friendly for non-technical operators | floors[] array drives total_floors + total_seats + seat_layout on submit; edit pre-fill parses floor_N keys back |
| total_floors and total_seats derived (not form inputs) | Eliminates possibility of conflicts between visual config and manual counts | Cleaner form, one source of truth; both values computed in onSubmit |
| ColumnDef imported from @shared/ui/data-table directly | Barrel (@shared/ui/index.ts) does not re-export ColumnDef type | Follow this pattern for other type imports from data-table in future phases |
| useToast() hook pattern | Consistent with login-page.tsx; standalone toast not exported from barrel | Use `const { toast } = useToast()` in all future components |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 1 | Visual seat editor — user-approved before checkpoint |
| Auto-fixed | 4 | TypeScript build issues under strict tsc -b |
| Deferred | 0 | — |

**Total impact:** One user-requested scope extension; four auto-fixes for TypeScript strict-mode compatibility.

### Scope Addition

**Visual Seat Layout Editor**
- **Plan boundary:** "Seat layout input is a JSON textarea — no visual seat map editor (future enhancement)"
- **Change:** User requested visual configurator before approving checkpoint; implemented within same session
- **Implementation:** `SeatLayoutEditor` component with `SeatGrid` preview; `floors[]` field array in form schema replacing `seat_layout`/`total_floors`/`total_seats`; edit mode parses `floor_N` keys back to structured form state

### Auto-fixed Issues

**1. ColumnDef not exported from @shared/ui barrel**
- **Found during:** Task 2 build verify
- **Fix:** Import `ColumnDef` from `@shared/ui/data-table` directly

**2. Cell parameter implicit any under tsc -b strict mode**
- **Found during:** Task 2 build verify
- **Fix:** Annotate cell parameters explicitly as `VehicleType[keyof VehicleType]` (the union type expected by ColumnDef)

**3. toast standalone function not in @shared/ui barrel**
- **Found during:** Task 2 code review
- **Fix:** Replace `import { toast }` with `const { toast } = useToast()` (consistent with login-page.tsx)

**4. total_seats / total_floors removed from form schema**
- **Found during:** Visual editor scope addition
- **Fix:** Both derived from floors[] array in onSubmit handler; schema simplified to name/description/floors/amenities

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /feature-sliced-design | ✓ | Loaded before execution |
| /frontend-design | ✓ | Loaded before execution |

All required skills invoked ✓

## Next Phase Readiness

**Ready:**
- Entity slice pattern established: 03-02 (Vehicles) and 03-03 (Maintenance Logs) can follow the same structure
- `@entities/vehicle-type` fully exported — Vehicles page can import VehicleType for FK dropdown
- mapSupabaseError pattern ready to copy into all future CRUD modules
- DataTable cell typing pattern documented

**Concerns:**
- `ColumnDef` must be imported from `@shared/ui/data-table` not the barrel — document for 03-02/03-03 authors
- Seat layout visual editor parses `floor_N` key convention from DB — any existing records with different JSON structure won't pre-fill correctly (fallback: 5 rows × 4 seats)

**Blockers:**
- None — 03-02 Vehicles CRUD can begin immediately

---
*Phase: 03-vehicle-management, Plan: 01*
*Completed: 2026-04-14*
