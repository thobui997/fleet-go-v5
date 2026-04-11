# Plan 02-04: Trip Schema — SUMMARY

**Status:** ✅ COMPLETE
**Date:** 2026-04-11
**Wave:** 4

## Objective
Create the trip schema with `trips` and `trip_staff` tables, including proper FK references to routes/vehicles/employees, a partial unique index enforcing max 1 driver per trip, and realistic Vietnamese seed data.

## What Was Built

### 1. Migrations Created

#### `supabase/migrations/20260411150000_trip_schema.sql`
- **trips table** (11 columns):
  - id: uuid PK
  - route_id: FK → routes(id) ON DELETE RESTRICT
  - vehicle_id: FK → vehicles(id) ON DELETE RESTRICT
  - departure_time, estimated_arrival_time, actual_arrival_time: timestamptz
  - status: CHECK (scheduled, in_progress, completed, cancelled)
  - price_override: numeric(12,2) nullable with >= 0 CHECK
  - notes, created_at, updated_at
  - 2 CHECK constraints: departure_time < estimated_arrival_time, actual_arrival_time > departure_time
  - 4 indexes: route_id, (vehicle_id, departure_time), status, departure_time
  - Full table and column comments

- **trip_staff table** (6 columns):
  - trip_id: FK → trips(id) ON DELETE CASCADE
  - employee_id: FK → employees(id) ON DELETE RESTRICT
  - role: CHECK (driver, assistant)
  - notes, created_at, updated_at
  - Composite PK: (trip_id, employee_id)
  - 2 indexes: employee_id, role
  - **Partial unique index**: `idx_trip_staff_one_driver` (WHERE role = 'driver') — enforces max 1 driver per trip
  - COMMENT ON INDEX documenting the business rule
  - Full table and column comments

#### `supabase/migrations/20260411150001_trip_triggers.sql`
- `set_trips_updated_at` trigger on trips table
- `set_trip_staff_updated_at` trigger on trip_staff table
- Both use `handle_updated_at()` from core triggers

### 2. Seed Data Added

#### `supabase/seed.sql` — Trip Section
- **6 trips** covering:
  - 3 scheduled (2 with standard pricing, 1 with price_override)
  - 2 completed (1 with price_override, 1 with actual_arrival_time)
  - 1 cancelled (with notes explaining reason)
- **9 trip_staff assignments**:
  - 4 drivers (Bao Pham, Tuan Hoang, Nhan Vo assignments)
  - 2 assistants (Mai Dang on 2 different trips)
  - Each trip has exactly 1 driver (enforced by seed structure)

## Acceptance Criteria Met

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Trip Tables Created | ✅ | All columns, FKs, constraints, composite PK present |
| AC-2: Indexes Support Query Patterns | ✅ | 6 indexes including composite (vehicle_id, departure_time) and partial unique for 1-driver rule |
| AC-3: Triggers Active | ✅ | Both tables have updated_at triggers |
| AC-4: Realistic Trip Seed Data | ✅ | 6 trips, 9 assignments, SELECT-based FK resolution, idempotent |

## Deviations

### Issue During Execution
- **Error**: `column reference "id" is ambiguous` in trip_staff seed inserts
- **Root Cause**: When joining trips, routes, and vehicles (all have `id` columns), `select id` was ambiguous
- **Fix Applied**: Changed all trip_staff inserts from `select id from public.trips t` to `select t.id from public.trips t`
- **Type**: Code issue (plan was correct, implementation needed table qualifier)

### Audit Findings Applied (From 02-04-AUDIT.md)
- ✅ Composite index `idx_trips_vehicle_departure` on (vehicle_id, departure_time) instead of separate vehicle_id index
- ✅ COMMENT ON INDEX for partial unique index explaining business rule
- ✅ Cleaned up Task 3 action to remove deliberation text, present final assignments

## Files Modified

```
supabase/migrations/20260411150000_trip_schema.sql  (created)
supabase/migrations/20260411150001_trip_triggers.sql (created)
supabase/seed.sql                                    (appended trip section)
```

## Next Steps

- Run `/paul:unify .paul/phases/02-database-foundation/02-04-PLAN.md` to close the loop
- Phase 2 progress: 4 of 7 plans complete (57%)
- Next plan: 02-05 (RLS Policies for Core, Fleet, Route, Trip schemas)

---

**APPLY Execution Summary:**
- Tasks completed: 4 of 4 (3 auto + 1 checkpoint)
- Checkpoint resolved: 1 (approved after fix)
- Deviations: 1 (ambiguous column reference — fixed and re-approved)
- Verification: SQL parses correctly, seed data idempotent
