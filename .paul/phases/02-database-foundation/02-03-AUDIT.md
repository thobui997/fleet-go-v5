# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-03-PLAN.md
**Audited:** 2026-04-11
**Verdict:** Conditionally Acceptable

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan follows established patterns from 02-01/02-02 and is structurally sound. Two concrete data integrity gaps were found — coordinate range validation and empty string protection — both now applied. The plan is ready for APPLY after these fixes.

## 2. What Is Solid

- **Composite PK on route_stops (route_id, station_id):** Consistent with user_roles pattern. Eliminates surrogate key noise and naturally enforces "a station appears once per route."
- **UNIQUE (route_id, stop_order):** Prevents two stops from occupying the same position. Critical for ordering correctness.
- **FK cascade strategy:** RESTRICT on stations (can't delete a station referenced by routes or stops), CASCADE on routes (deleting a route cleans up its stops). Correct and deliberate.
- **different_origin_destination CHECK:** Prevents degenerate routes where origin = destination. Simple but essential.
- **SELECT-based FK resolution in seed data:** Follows 02-02's proven pattern. Works correctly with ON CONFLICT DO NOTHING on re-runs.
- **Triggers reuse handle_updated_at():** No function duplication. Consistent with all prior schema plans.
- **Direct route test case (Ha Noi → Vinh, zero intermediates):** Good edge case coverage for a common real-world scenario.
- **Seed data separation:** route_stops stores only intermediate stops, with origin/destination on routes table. Clean match for Phase 4 UI workflow (select origin/destination first, then drag-and-drop intermediates).

## 3. Enterprise Gaps Identified

1. **Latitude/longitude range validation missing:** No CHECK constraints on coordinate columns. Allows inserting latitude=999 or longitude=-500, which is physically impossible and would break any map rendering or distance calculation. Fixed.

2. **Empty string protection missing on name columns:** stations.name and routes.name are NOT NULL UNIQUE, but PostgreSQL allows empty strings for NOT NULL columns. A station named '' would pass validation but break every display and lookup. Fixed.

3. **No DB-level constraint preventing intermediate stop from matching origin/destination:** A route_stop could reference the same station as the route's origin_station_id or destination_station_id. This is semantically wrong (the origin and destination are defined on the routes table, not in route_stops). However, enforcing this requires a cross-table CHECK or trigger — complex for marginal benefit. Application layer in Phase 4 will validate this. Deferred.

4. **No monotonic estimated_arrival ordering enforcement:** stop_order 2 could have a smaller estimated_arrival than stop_order 1. Enforcing ordering consistency requires a trigger comparing adjacent rows. Application layer handles this. Deferred.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Coordinate range validation | Task 1 (stations table), AC-1, Verification | Added `CHECK (latitude BETWEEN -90 AND 90)` and `CHECK (longitude BETWEEN -180 AND 180)` to stations table definition. Updated AC-1 and verification checklist. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Empty string protection on name columns | Task 1 (stations + routes), AC-1, Verification | Added `CHECK (trim(name) <> '')` to stations.name and routes.name. Updated AC-1 and verification checklist. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | route_stops.station_id != route's origin/destination | Requires cross-table CHECK or trigger. Application layer in Phase 4 enforces this during route creation. Not a DB-only concern. |
| 2 | Monotonic estimated_arrival ordering per route | Requires trigger comparing adjacent rows. Application layer handles stop ordering and timing consistency. |

## 5. Audit & Compliance Readiness

- **Defensible audit evidence:** Migration files with comments provide full schema history. Seed data is idempotent and reproducible.
- **Silent failure prevention:** CHECK constraints on distance, duration, base_price, coordinates, and names prevent garbage data at the DB level. FK RESTRICT prevents orphaned references.
- **Post-incident reconstruction:** updated_at triggers track modification timestamps. Migration versioning enables schema rollback.
- **Ownership and accountability:** Single-author migration files with clear prerequisites and sequential versioning.

## 6. Final Release Bar

**Must be true before shipping:**
- Coordinate CHECK constraints present on stations.latitude and stations.longitude
- Empty string CHECK constraints present on stations.name and routes.name
- All 3 tables created with FKs, indexes, and comments
- Seed data inserts cleanly (10 stations, 4 routes, 13 route_stops)

**Risks remaining if shipped as-is:**
- Intermediate stop could overlap with origin/destination (application-layer gap, not DB)
- estimated_arrival ordering not enforced at DB level (application-layer gap)

**Would I sign my name to this schema?** Yes, with the applied fixes. The core data integrity constraints are solid. The deferred items are application-layer concerns that don't belong in the DB for v0.1.

---

**Summary:** Applied 1 must-have + 1 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
