---
phase: 02-database-foundation
plan: 03
subsystem: database
tags: postgres, supabase, migrations, routes, stations, seed-data

# Dependency graph
requires:
  - phase: 02-database-foundation (plan 02-01)
    provides: core schema with handle_updated_at() function
  - phase: 02-database-foundation (plan 02-02)
    provides: fleet schema patterns for reference
provides:
  - Route tables: stations, routes, route_stops
  - Route seed data: 10 stations, 4 routes, 13 intermediate stops
  - Foundation for trip scheduling (plan 02-06) and ticketing (plan 02-07)
affects: ["02-04", "02-05", "02-06", "02-07", "06-trips", "07-ticketing"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SELECT-based FK resolution for idempotent seeding
    - Composite PK on junction tables (route_id, station_id)
    - Coordinate range validation (latitude -90..90, longitude -180..180)
    - Empty string protection (CHECK trim(name) <> '')

key-files:
  created:
    - supabase/migrations/20260411140000_route_schema.sql
    - supabase/migrations/20260411140001_route_triggers.sql
  modified:
    - supabase/seed.sql

key-decisions: []

patterns-established:
  - Route stop ordering via UNIQUE (route_id, stop_order)
  - Intermediate stops only (origin/destination not in route_stops)
  - Direct route support (zero intermediate stops)

# Metrics
duration: 15min
started: 2026-04-11T14:30:00Z
completed: 2026-04-11T14:45:00Z
---

# Phase 2 Plan 03: Route Schema Summary

**Created route database schema with stations, routes, and route_stops tables supporting ordered intermediate stops, GPS coordinates, and Vietnamese seed data.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 15min |
| Started | 2026-04-11T14:30:00Z |
| Completed | 2026-04-11T14:45:00Z |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files modified | 3 (2 created, 1 appended) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Route Tables Created | Pass | 3 tables with all columns, FKs, CHECK constraints (including coordinate ranges and empty string protection) |
| AC-2: Indexes Support Query Patterns | Pass | B-tree indexes on city, origin/destination, stop_order |
| AC-3: Triggers Active | Pass | updated_at triggers on stations and routes, reusing handle_updated_at() |
| AC-4: Realistic Route Seed Data | Pass | 10 stations, 4 routes, 13 route_stops with SELECT-based FK resolution |

## Accomplishments

- Route schema with 3 tables: stations (GPS coordinates), routes (origin/destination with distance/duration/price), route_stops (ordered intermediate stops)
- Coordinate validation: latitude (-90..90), longitude (-180..180) CHECK constraints prevent invalid GPS data
- Empty string protection: stations.name and routes.name reject empty/whitespace-only strings
- Vietnamese seed data: 10 realistic stations across Hanoi, HCMC, Da Nang, Thanh Hoa, Vinh, Dong Hoi, Hue, Quy Nhon, Nha Trang
- Direct route test case: "Ha Noi → Vinh" has zero intermediate stops
- Idempotent seeding: all inserts use ON CONFLICT with explicit targets

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260411140000_route_schema.sql` | Created (171 lines) | Route tables: stations, routes, route_stops with FKs, constraints, indexes, comments |
| `supabase/migrations/20260411140001_route_triggers.sql` | Created (32 lines) | updated_at triggers for stations and routes tables |
| `supabase/seed.sql` | Appended (+210 lines) | Route seed data: 10 stations, 4 routes, 13 route_stops |

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- Route schema supports trip scheduling (plan 02-06: Trip Schema)
- Route tables provide foundation for pricing calculations
- Seed data covers major Vietnamese cities for realistic testing

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 02-database-foundation, Plan: 03*
*Completed: 2026-04-11*
