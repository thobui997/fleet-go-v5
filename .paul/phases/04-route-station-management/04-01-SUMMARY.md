# 04-01 SUMMARY — Stations CRUD

**Phase:** 04 — Route & Station Management
**Plan:** 04-01
**Status:** APPLY complete, human-verify approved

---

## What Was Built

### Task 1: Station entity slice
- `src/entities/station/model/types.ts` — Station, StationInsert, StationUpdate, StationListParams
- `src/entities/station/api/station.api.ts` — 5 CRUD functions; search trims before `.or()` ilike; isActive filter; order by name asc
- `src/entities/station/api/station.queries.ts` — 5 TanStack Query hooks
- `src/entities/station/index.ts` — barrel export
- `src/entities/index.ts` — added `export * from './station'`

### Task 2: Station page + dialogs + router
- `src/pages/stations/model/station-form-schema.ts` — Zod schema, mapSupabaseError, serializeToInsert
- `src/pages/stations/ui/station-page.tsx` — DataTable + search + status filter + error state + retry
- `src/pages/stations/ui/station-form-dialog.tsx` — create/edit form with Controller Switch for is_active
- `src/pages/stations/ui/station-delete-dialog.tsx` — delete confirm with RESTRICT error mapping
- `src/pages/stations/index.ts` — barrel
- `src/pages/index.ts` — added StationsPage export
- `src/app/lib/router.tsx` — ROUTES.STATIONS → StationsPage (replaced PlaceholderPage)

### Shared UI addition
- `src/shared/ui/switch.tsx` — Switch component (Radix UI primitive)
- `src/shared/ui/index.ts` — exported Switch
- `package.json` — added `@radix-ui/react-switch` (installed with `--legacy-peer-deps`)

---

## Acceptance Criteria Results

| AC | Description | Result |
|----|-------------|--------|
| AC-1 | List page with DataTable | ✅ PASS |
| AC-2 | Search filter (300ms debounce, name/city) | ✅ PASS |
| AC-3 | Status filter (is_active) | ✅ PASS |
| AC-4 | Create station with toast | ✅ PASS |
| AC-5 | Edit station pre-filled | ✅ PASS |
| AC-6 | Delete with toast | ✅ PASS |
| AC-7 | Zod validation (Vietnamese messages) | ✅ PASS |
| AC-8 | Supabase error mapping | ✅ PASS (delete-RESTRICT deferred — see below) |
| AC-9 | List error state with retry | ✅ PASS |
| AC-10 | Dialog close guard while isPending | ✅ PASS |

---

## Deviations from Plan

None. All tasks executed as specified.

---

## Key Implementation Notes

1. **mapSupabaseError** — 23505 checks `stations_name_key` in message OR `(name)` in details; same pattern for `stations_code_key`/`(code)`. Includes `details?: string` in param type.
2. **Form reset** — explicit inline `useEffect([station, reset])`: create mode resets to empty strings + is_active:true; edit mode maps station fields directly. No `serializeFormDefaults` helper.
3. **lat/lng inputs** — `type="text"` with `z.coerce.number()` in schema. Edit mode passes the raw number directly (React renders it as string in the input).
4. **is_active** — `<Controller name="is_active" control={control}>` wrapping `<Switch checked={field.value} onCheckedChange={field.onChange} />`.
5. **Switch component** — `@radix-ui/react-switch` installed; Switch component added to `src/shared/ui/switch.tsx` and exported from the shared/ui barrel.

---

## Deferred Items

- **AC-8 delete-RESTRICT test** — Cannot verify until a route references a station. Document: "AC-8 delete-RESTRICT deferred to 04-02 — will verify after first route is created linking a station."
- URL-synced filters — deferred (from audit)
- StationStatusBadge extraction — deferred (inline Badge sufficient for MVP)
- ARIA attributes — deferred (pre-existing deferred item)

---

## Public API Established

`@entities/station` exports:
- Types: `Station`, `StationInsert`, `StationUpdate`, `StationListParams`
- Hooks: `useStations`, `useStation`, `useCreateStation`, `useUpdateStation`, `useDeleteStation`

**Ready for 04-02** — Routes CRUD can use `@entities/station` for FK dropdowns (origin/destination station selects).

---

*SUMMARY created: 2026-04-15*
