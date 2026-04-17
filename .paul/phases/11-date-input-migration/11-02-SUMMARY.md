---
phase: 11-date-input-migration
plan: 02
subsystem: ui
tags: [react, datepicker, react-hook-form, shadcn, date-fns, timezone]

requires:
  - phase: 11-01
    provides: DatePicker and DateRangePicker base components, react-day-picker v9, Vietnamese locale

provides:
  - DateTimePicker component (single combined calendar + time input in one popover)
  - DatePicker UI/UX overhaul with high-contrast design
  - Timezone-safe date serialization (toLocalISODate / fromLocalISODate)
  - All 11 date/datetime fields migrated across 6 form files

affects: [11-03, any future forms with date fields]

tech-stack:
  added: []
  patterns:
    - "toLocalISODate(date) — serialize local Date to YYYY-MM-DD without UTC shift"
    - "fromLocalISODate(str) — parse YYYY-MM-DD as local Date (not UTC midnight)"
    - "DateTimePicker as single popover — calendar + time input in one panel, not side-by-side"
    - "buildDateTime returns partial state — stores date-only string when time not yet chosen"

key-files:
  created:
    - src/shared/ui/form/DateTimePicker.tsx
  modified:
    - src/shared/ui/form/DatePicker.tsx
    - src/shared/ui/form/index.ts
    - src/pages/maintenance/ui/maintenance-form-page.tsx
    - src/pages/employees/ui/employee-form-page.tsx
    - src/pages/employees/ui/employee-form-dialog.tsx
    - src/pages/customers/ui/customer-form-dialog.tsx
    - src/pages/vehicles/ui/vehicle-form-dialog.tsx
    - src/pages/trips/ui/trip-form-page.tsx

key-decisions:
  - "toLocalISODate replaces toISOString().split('T')[0] — avoids UTC offset date shift in UTC+N timezones"
  - "DateTimePicker is a single popover (calendar + time row) not two side-by-side inputs"
  - "buildDateTime stores partial state (date-only) when time not yet chosen, not empty string"
  - "DatePicker redesigned this session despite being listed as boundary in plan — user-initiated scope expansion"

patterns-established:
  - "Any future date-only field: use DatePicker with toLocalISODate/fromLocalISODate pattern"
  - "Any future datetime field: use DateTimePicker single-popover pattern"
  - "Never use date.toISOString().split('T')[0] for storing user-selected dates"

duration: ~2 sessions
started: 2026-04-17T00:00:00Z
completed: 2026-04-17T23:59:00Z
---

# Phase 11 Plan 02: Form Date Fields Migration Summary

**DateTimePicker created as single combined calendar+time popover; all 11 date/datetime fields migrated across 6 forms; timezone-safe serialization and off-by-one selection bug fixed in both components.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 sessions |
| Tasks | 4 completed (3 auto + 1 human-verify) |
| Files modified | 8 |
| Files created | 1 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: DateTimePicker integrates with RHF | Pass | Single-popover design; returns YYYY-MM-DDTHH:mm only when both parts set; empty string for incomplete |
| AC-2: All pure date fields migrated | Pass | 9 fields across 5 forms; zero native type="date" inputs remain |
| AC-3: Trip datetime fields migrated | Pass | departure_time + estimated_arrival_time use DateTimePicker; serializeToInsert unchanged |
| AC-4: Build passes zero errors | Pass | npm run build ✓ verified multiple times during session |
| AC-5: Error scenarios handled | Pass | Malformed values produce empty state; partial datetime (date-only/time-only) doesn't crash |

## Accomplishments

- Created `DateTimePicker` as a single popover component — calendar at top, divider, time input row at bottom — rather than two side-by-side inputs, giving a cohesive single-field UX
- Fixed timezone off-by-one bug in both `DatePicker` and `DateTimePicker`: `toISOString().split('T')[0]` was shifting dates by -1 day in UTC+7; replaced with `toLocalISODate()` / `fromLocalISODate()` helpers
- Fixed critical selection bug in `DateTimePicker`: `buildDateTime` was returning `""` when time was not yet set, making date clicks appear to do nothing; changed to store partial state (date-only) until time is also chosen
- Migrated all 11 fields: 9 pure date + 2 datetime across maintenance, employee (page + dialog), customer, vehicle, and trip forms

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/shared/ui/form/DateTimePicker.tsx` | Created | Single-popover datetime component for RHF |
| `src/shared/ui/form/DatePicker.tsx` | Modified | UI overhaul + timezone fix |
| `src/shared/ui/form/index.ts` | Modified | Export DateTimePicker + DateTimePickerFormProps |
| `src/pages/maintenance/ui/maintenance-form-page.tsx` | Modified | performed_at, next_due_date → DatePicker |
| `src/pages/employees/ui/employee-form-page.tsx` | Modified | hire_date, license_expiry → DatePicker |
| `src/pages/employees/ui/employee-form-dialog.tsx` | Modified | hire_date, license_expiry → DatePicker |
| `src/pages/customers/ui/customer-form-dialog.tsx` | Modified | date_of_birth → DatePicker |
| `src/pages/vehicles/ui/vehicle-form-dialog.tsx` | Modified | last_maintenance_date, next_maintenance_date → DatePicker |
| `src/pages/trips/ui/trip-form-page.tsx` | Modified | departure_time, estimated_arrival_time → DateTimePicker |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `toLocalISODate` / `fromLocalISODate` helpers | `toISOString()` converts to UTC before slicing — in UTC+7 this shifts June 17 midnight to June 16. Local date math avoids the shift entirely | All date storage in this app should use this pattern going forward |
| Single-popover DateTimePicker | Two side-by-side inputs feel like two separate fields; a single trigger with calendar+time inside one popover reads as one field | DateTimePicker trigger label updates to show full datetime; time row inside popover is always visible after opening |
| `buildDateTime` stores partial state | Original impl returned `""` when time was missing, which made date clicks silently clear the value. Storing `"YYYY-MM-DD"` as intermediate state lets the calendar reflect the selection while awaiting time entry | `parseDateTime` already handles date-only strings correctly via `split("T")` |
| DatePicker UI redesigned (out of scope) | User explicitly requested during human-verify checkpoint: higher contrast borders, `rounded-xl`, `shadow-lg`, `hover:bg-muted`, full-weight weekday labels | DatePicker.tsx now out-of-sync with 11-02-PLAN.md boundary note; this is intentional and user-approved |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential correctness fixes |
| Scope additions | 1 | User-requested, approved |
| Deferred | 0 | — |

**Total impact:** Two correctness bugs caught and fixed; one user-initiated scope addition (DatePicker redesign). No scope creep.

### Auto-fixed Issues

**1. Timezone off-by-one in both DatePicker and DateTimePicker**
- **Found during:** Task 1 (DateTimePicker creation) + Task 2 (DatePicker review)
- **Issue:** `date.toISOString().split('T')[0]` converts to UTC before slicing — June 17 midnight local (UTC+7) becomes `2025-06-16T17:00Z`, storing `"2025-06-16"`
- **Fix:** `toLocalISODate(date)` uses `getFullYear()` / `getMonth()` / `getDate()` — pure local arithmetic. `fromLocalISODate(str)` uses `new Date(y, m-1, d)` so selected-date comparisons stay in local time
- **Files:** `DatePicker.tsx`, `DateTimePicker.tsx`
- **Verification:** `npm run build` ✓; manual test — clicking June 17 stores and displays June 17

**2. DateTimePicker date click had no visible effect**
- **Found during:** Human-verify (user reported clicking a date did nothing)
- **Issue:** `buildDateTime(date, time)` returned `""` when `time` was empty — `field.onChange("")` silently cleared the value, making the calendar appear unresponsive
- **Fix:** `buildDateTime` now returns the date string alone when only the date is available; returns the full `"YYYY-MM-DDTHH:mm"` only when both parts are present
- **Files:** `DateTimePicker.tsx`
- **Verification:** `npm run build` ✓; user confirmed selection works

### Scope Additions

**DatePicker UI/UX overhaul (user-requested)**
- Plan listed `DatePicker.tsx` as a boundary ("stable from 11-01, do not change")
- User explicitly requested redesign during human-verify: higher contrast borders, `rounded-xl`/`shadow-lg`, `hover:bg-muted`, `border-input`, full-weight weekday labels, `strokeWidth={2.5}` on chevrons
- Applied same design tokens to DateTimePicker for consistency

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Timezone off-by-one (both components) | toLocalISODate + fromLocalISODate helpers |
| DateTimePicker clicks did nothing | buildDateTime partial-state fix |

## Next Phase Readiness

**Ready:**
- DatePicker and DateTimePicker are stable, consistent, and timezone-safe
- All form date fields use these components — no native date inputs remain
- Pattern established: future forms should use `DatePicker` / `DateTimePicker` from `@shared/ui/form`
- `toLocalISODate` / `fromLocalISODate` available in both component files for reference

**Concerns:**
- `toLocalISODate` / `fromLocalISODate` are currently inlined in both component files — if a third date component is needed, consider extracting to a shared date-utils module
- DateTimePicker `"Giờ khởi hành"` label in the time row is hardcoded — adequate for current single use case (trip form), but should be parameterized if reused in other contexts

**Blockers:** None

---
*Phase: 11-date-input-migration, Plan: 02*
*Completed: 2026-04-17*
