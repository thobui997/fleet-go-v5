---
phase: 02-database-foundation
plan: 02
subsystem: database
tags: postgresql, supabase, schema-design, jsonb, indexes, fleet-management

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Supabase project setup, auth configuration
  - phase: 02-database-foundation (02-01)
    provides: Core schema patterns, handle_updated_at() function
provides:
  - Fleet database schema (vehicle_types, vehicles, maintenance_logs)
  - Foundation for vehicle management (Phase 3), trip scheduling (Phase 6)
affects: 03-vehicle-management, 06-trip-scheduling, 02-06-rls-policies

# Tech tracking
tech-stack:
  added: []
  patterns: [jsonb-type-validation, select-based-fk-resolution, idempotent-seeding]

key-files:
  created:
    - supabase/migrations/20260411130000_fleet_schema.sql
    - supabase/migrations/20260411130001_fleet_triggers.sql
  modified:
    - supabase/seed.sql

key-decisions:
  - "SELECT-based FK resolution: Use SELECT FROM for FK references in seed data, not CTE INSERT...RETURNING, to work correctly with ON CONFLICT DO NOTHING"
  - "Explicit ON CONFLICT targets: Always specify conflict column (name, license_plate, id) to avoid ambiguity"

patterns-established:
  - "JSONB type CHECK constraints: Add CHECK (jsonb_typeof(column) = 'object'/'array') for all JSONB columns"
  - "Idempotent seeding: ON CONFLICT (unique_column) DO NOTHING + SELECT-based FK resolution"
  - "FK cascade strategy: RESTRICT on type tables (prevent orphaned records), CASCADE on child tables (clean deletion)"

# Metrics
duration: ~25min
started: 2026-04-11T14:00:00Z
completed: 2026-04-11T14:25:00Z
---

# Phase 2 Plan 02: Fleet Schema Summary

**Fleet database schema with vehicle_types, vehicles, and maintenance_logs tables; JSONB seat layouts with type validation; Vietnamese seed data; proper indexes and triggers.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~25 minutes |
| Started | 2026-04-11 |
| Completed | 2026-04-11 |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files modified | 3 (2 created, 1 appended) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Fleet Tables Created | ✅ Pass | 3 tables: vehicle_types, vehicles, maintenance_logs. Proper FKs, constraints (including JSONB type checks), indexes. |
| AC-2: Indexes Support Query Patterns | ✅ Pass | 9 indexes: GIN on JSONB columns, B-tree on FKs, status, dates. Covers type, status, date, license_plate queries. |
| AC-3: Triggers Active | ✅ Pass | 3 updated_at triggers reuse handle_updated_at() from 02-01. |
| AC-4: Realistic Fleet Seed Data | ✅ Pass | 5 vehicle types, 8 vehicles, 6 maintenance logs with Vietnamese data and referential integrity. |

## Accomplishments

- **Fleet schema established**: vehicle_types with JSONB seat layouts and amenities, vehicles with status tracking, maintenance_logs with cost history
- **JSONB type validation**: CHECK constraints on both JSONB columns (seat_layout object, amenities array) following 02-01 audit pattern
- **Idempotent seeding**: SELECT-based FK resolution with explicit ON CONFLICT targets — works correctly on re-runs
- **Proper FK cascade strategy**: RESTRICT on vehicle_types (prevents deleting type with vehicles), CASCADE on maintenance_logs (clean removal with vehicle)
- **Vietnamese context**: Realistic vehicle types (Giuong nam, Limousine, Ghe ngoi), license plates (51A-xxxxx), and mechanic names

## Task Commits

| Task | Status | Description |
|------|--------|-------------|
| Task 1: Fleet Schema Migration | ✅ Done | Created 3 tables with FKs, CHECK constraints, GIN indexes, comments |
| Task 2: Fleet Triggers Migration | ✅ Done | Created 3 updated_at triggers reusing handle_updated_at() |
| Task 3: Fleet Seed Data | ✅ Done | Appended 5 vehicle types, 8 vehicles, 6 maintenance logs to seed.sql |
| Task 4: Checkpoint | ✅ Approved | User verified schema applied in Supabase Dashboard |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260411130000_fleet_schema.sql` | Created | Fleet tables: vehicle_types, vehicles, maintenance_logs with FKs, constraints, indexes |
| `supabase/migrations/20260411130001_fleet_triggers.sql` | Created | updated_at triggers for all 3 fleet tables |
| `supabase/seed.sql` | Modified | Appended fleet seed data (5 types, 8 vehicles, 6 logs) after core data |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **SELECT-based FK resolution in seed data** | CTE INSERT...RETURNING returns zero rows when ON CONFLICT DO NOTHING triggers. SELECT FROM existing rows works on re-runs. | Seed data is truly idempotent — can run multiple times without issues. |
| **Explicit ON CONFLICT targets** | PostgreSQL requires conflict target matching UNIQUE constraint. Specifying (name), (license_plate), (id) removes ambiguity. | Clearer intent, less fragile than relying on constraint inference. |
| **CHECK on seat_layout JSONB type** | Following 02-01 audit pattern for JSONB validation. Phase 3 assumes object structure. | Prevents malformed data (arrays, scalars) from causing runtime errors in seat selection. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Audit fixes applied | 3 | Strengthened data validation and idempotency |

### Audit Fixes Applied

**1. JSONB Type Validation (from audit)**
- **Applied during:** Planning phase (before execution)
- **Issue:** seat_layout had no CHECK constraint for JSONB type
- **Fix:** Added `CHECK (jsonb_typeof(seat_layout) = 'object')`
- **Files:** 20260411130000_fleet_schema.sql
- **Verification:** SQL syntax valid, matches amenities pattern

**2. Explicit ON CONFLICT Targets (from audit)**
- **Applied during:** Planning phase (before execution)
- **Issue:** ON CONFLICT DO NOTHING without target column is ambiguous
- **Fix:** Specified (name), (license_plate), (id) targets
- **Files:** supabase/seed.sql
- **Verification:** All inserts have explicit conflict targets

**3. SELECT-based FK Resolution (from audit)**
- **Applied during:** Planning phase (before execution)
- **Issue:** CTE INSERT...RETURNING breaks on ON CONFLICT re-runs
- **Fix:** Changed to SELECT-based FK resolution pattern
- **Files:** supabase/seed.sql
- **Verification:** All vehicle and maintenance_log inserts use SELECT FROM

### Execution Deviations

None — plan executed exactly as specified.

## Issues Encountered

None — all tasks completed cleanly with no errors or escalations.

## Next Phase Readiness

**Ready:**
- Fleet schema complete with proper constraints and indexes
- Seed data provides realistic test data for development
- Patterns established: JSONB validation, idempotent seeding, FK cascade strategy

**Concerns:**
- None

**Blockers:**
- None

**Next in Phase 2:**
- Plan 02-03: Route Schema (stations, routes, route_stops)
- Plan 02-04: Trip Schema (trips, trip_staff)
- Plan 02-05: Booking Schema (customers, bookings, tickets, payments)
- Plan 02-06: RLS Policies & Security
- Plan 02-07: Triggers & Database Functions

---
*Phase: 02-database-foundation, Plan: 02*
*Completed: 2026-04-11*
