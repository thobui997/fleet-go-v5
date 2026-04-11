# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-02-PLAN.md
**Audited:** 2026-04-11
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — upgraded to ready after applying fixes.**

The plan builds directly on audited patterns from 02-01 and inherits the corrections applied there (JSONB type checks, UNIQUE constraints, CHECK constraints). Schema design is sound: proper FK cascade strategy (RESTRICT on vehicle_types to prevent orphaned vehicles, CASCADE on maintenance_logs for vehicle deletion), CHECK constraints on status enums and numeric bounds, GIN indexes on JSONB columns.

This audit found 0 release-blocking issues and 3 defensive improvements — all applied.

## 2. What Is Solid

- **FK cascade strategy is correct:** vehicle_types ON DELETE RESTRICT prevents deleting a type while vehicles reference it. maintenance_logs ON DELETE CASCADE is appropriate because maintenance history belongs to a specific vehicle and has no standalone audit value after vehicle removal. vehicles uses gen_random_uuid() PK, not auth.users FK — no cascading auth dependency.

- **CHECK constraints on enums:** vehicles.status and maintenance_logs.type use CHECK IN (...) constraints, preventing invalid state values at the database level. Numeric bounds on mileage, cost, year_manufactured prevent negative or nonsensical values.

- **JSONB amenities already has type CHECK:** Following the 02-01 audit pattern, amenities uses `CHECK (jsonb_typeof(amenities) = 'array')`. Applied from the start, not retroactively.

- **GIN indexes on both JSONB columns:** seat_layout and amenities both get GIN indexes, enabling containment queries without full-table scans. Correct index type for JSONB.

- **UNIQUE on license_plate and vin_number:** license_plate NOT NULL UNIQUE (every vehicle must have one, no duplicates). vin_number UNIQUE nullable (optional, but unique when present). PostgreSQL UNIQUE allows multiple NULLs — correct for optional fields.

- **ON DELETE RESTRICT on vehicle_types FK:** Prevents accidental deletion of a vehicle type that has associated vehicles. The application should use soft-delete (status='retired') rather than hard-delete.

- **Boundaries section is explicit:** Clearly locks 02-01 migrations and core seed data, lists RLS and business logic triggers as out-of-scope with deferred plan numbers.

- **Task structure follows 02-01 pattern:** Schema migration → triggers → seed data → checkpoint. Proven execution order.

## 3. Enterprise Gaps Identified

1. **Missing CHECK on vehicle_types.seat_layout JSONB type:** The plan stored seat_layout as `jsonb NOT NULL` but had no type validation. PostgreSQL accepts any JSONB — a string like `'"invalid"'` or an array `[1,2,3]` would be silently stored. Phase 3 code assumes an object structure with floors/rows/seats. A malformed value would cause runtime errors in seat selection with no clear root cause. The amenities column already had this check; seat_layout was an oversight.

2. **ON CONFLICT targets unspecified in seed data:** The plan said "use ON CONFLICT DO NOTHING" without specifying the conflict column. PostgreSQL ON CONFLICT requires a conflict target matching a UNIQUE constraint or constraint name. Without explicit targets, the implementer might guess wrong or use ON CONFLICT ON CONSTRAINT which is fragile if constraint names change. Specifying exact targets (name, license_plate, id) removes ambiguity.

3. **CTE INSERT...RETURNING fails on idempotent re-runs:** The plan specified `WITH ... AS INSERT ... RETURNING id` for FK resolution. When ON CONFLICT DO NOTHING triggers (on re-run), RETURNING returns zero rows, breaking downstream INSERTs that reference the CTE. SELECT-based resolution (INSERT first, then SELECT by unique key for FK) is the correct idempotent pattern.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| — | None found | — | — |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | seat_layout accepts non-object JSONB | Task 1 (vehicle_types table spec), AC-1, verification | Added `CHECK (jsonb_typeof(seat_layout) = 'object')` to column definition, updated AC-1 text, added verification checklist item |
| 2 | ON CONFLICT targets unspecified | Task 3 (seed data) | Added explicit conflict targets per table: (name), (license_plate), (id) |
| 3 | CTE INSERT...RETURNING breaks idempotency | Task 3 (seed data), verify section | Replaced CTE approach with SELECT-based FK resolution pattern, updated verify text |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | No regex CHECK on vehicles.license_plate format | UNIQUE already prevents duplicates. Vietnamese plate format has variations (51A-12345, 30A1-56789, etc.) and may change. Application-level validation is more flexible for format evolution. |
| 2 | No status transition constraints on vehicles.status | Preventing invalid transitions (e.g., retired→active without maintenance) requires a trigger. Explicitly deferred to Plan 02-07 (Triggers & Database Functions). |
| 3 | vehicles.next_maintenance_date denormalized from maintenance_logs.next_due_date | Sync between these fields requires a trigger on maintenance_logs INSERT/UPDATE. Explicitly deferred to Plan 02-07. |

## 5. Audit & Compliance Readiness

- **Data integrity:** UNIQUE constraints on license_plate, vin_number, and vehicle_types.name prevent duplicates. CHECK constraints validate status/type enums, numeric bounds, and JSONB structure. FK RESTRICT prevents orphaned vehicles. Acceptable.
- **Audit trail:** updated_at triggers on all tables provide modification timestamps. maintenance_logs provides maintenance history with dates, costs, and performer. Acceptable.
- **Silent failure prevention:** CHECK constraints on both JSONB columns (seat_layout object, amenities array) prevent malformed data. ON CONFLICT DO NOTHING prevents seed failures on re-runs. Acceptable.
- **Idempotency:** Seed data uses SELECT-based FK resolution with explicit ON CONFLICT targets — correct for repeatable execution. Acceptable.

## 6. Final Release Bar

**What must be true before this plan ships:**
- All 3 strongly-recommended fixes applied (seat_layout CHECK, ON CONFLICT targets, SELECT-based seeding)
- Human verifies migration applied to Supabase with all tables, constraints, indexes, and triggers
- Seed data loads cleanly with 5 vehicle types, 8 vehicles, 6 maintenance logs

**Remaining risks:**
- RLS policies not yet implemented (plan 02-06) — tables are accessible to all authenticated users until policies are added. Acceptable for Phase 2 sequential execution.
- Status transition logic deferred to 02-07 — vehicles can transition between any statuses until trigger is added. Acceptable for schema-only phase.
- Denormalized next_maintenance_date not synced with maintenance_logs — deferred to 02-07 trigger.

**Would I sign my name to this schema?** Yes. The plan builds on audited patterns and the remaining gaps are correctly deferred to specific future plans.

---

**Summary:** Applied 0 must-have + 3 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
