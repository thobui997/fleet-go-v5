# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-10)

**Core value:** Digitize and automate passenger coach fleet management into a single source of truth
**Current focus:** Phase 4 — Route & Station Management (not started)

## Current Position

Milestone: v0.1 MVP
Phase: 4 of 8 (Route & Station Management) — In Progress
Plan: 04-01 complete (loop closed)
Status: Loop complete — ready for 04-02 planning
Last activity: 2026-04-15 — UNIFY 04-01: Stations CRUD loop closed. @entities/station public API available.

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete — ready for next PLAN]
```

Progress:
- Milestone: [███░░░░░░░] 37% (3 of 8 phases complete)
- Phase 4: [███░░░░░░░] 33% (1 of 3 plans complete)

## Accumulated Context

### Decisions
- Supabase as BaaS — reduces backend dev time
- Feature-Sliced Design v2.1 — scalable architecture with clear boundaries
- Dynamic roles — flexible permission without code changes
- JSON seat layouts — supports diverse vehicle types
- TanStack Query — server-state caching, no global state store needed
- Phase 1 split into 4 plans: scaffolding, shared UI, auth, app shell
- 2026-04-10: **Added Phase 2 (Database Foundation)** — Inserted between Foundation & Auth and feature phases. Establishes complete schema design, migrations, RLS policies, and triggers before any feature development.
- 2026-04-10: Enterprise audit on 02-01-PLAN.md. Applied 1 must-have (UNIQUE employees.user_id for 1:1 enforcement), 3 strongly-recommended (CHECK roles.permissions JSONB array, UNIQUE employees.license_number, ON CONFLICT in handle_new_user trigger).
- 2026-04-11: Enterprise audit on 02-02-PLAN.md. Applied 3 strongly-recommended (CHECK seat_layout JSONB object type, explicit ON CONFLICT targets in seed, SELECT-based FK resolution instead of CTE RETURNING). Verdict: conditionally acceptable (now ready)
- 2026-04-11: Enterprise audit on 02-03-PLAN.md. Applied 1 must-have (latitude/longitude range CHECK on stations), 1 strongly-recommended (empty string CHECK on stations.name and routes.name). Verdict: conditionally acceptable (now ready)
- 2026-04-11: Enterprise audit on 02-04-PLAN.md. Applied 0 must-have, 3 strongly-recommended (composite index vehicle_id+departure_time, COMMENT ON INDEX for partial unique index, cleaned up Task 3 action). Verdict: conditionally acceptable (now ready)
- 2026-04-14: Enterprise audit on 02-05-PLAN.md. Applied 1 must-have (composite FK tickets(booking_id,trip_id) → bookings(id,trip_id) to prevent trip-drift), 6 strongly-recommended (audit-trail columns cancelled_at/cancelled_by/issued_by/processed_by/refunded_at; transaction_reference uniqueness for webhook replay protection; qr_code uniqueness for boarding validation). Deferred 6 items to 02-07 triggers or later phases. Verdict: conditionally acceptable (now ready). Flag for 02-07: audit-trail columns need immutability triggers.
- 2026-04-11: Plan 02-04 execution — Fixed ambiguous column reference in trip_staff seed inserts (`select id` → `select t.id`). Root cause: joining trips/routes/vehicles (all have `id` columns) required table qualifier.
- 2026-04-14: Enterprise audit on 02-06-PLAN.md. Applied 1 must-have (WITH CHECK on audit-attribution INSERT columns: created_by, issued_by, processed_by), 2 strongly-recommended (REVOKE/GRANT on helper functions; schema-qualify function calls in policies). Deferred 2 (cancelled_by UPDATE enforcement to 02-07; JWT-claim caching). Verdict: conditionally acceptable (now ready).
- 2026-04-14: Enterprise audit on 02-07-PLAN.md. Applied 3 must-have (distinct SQLSTATEs FG001-FG004 per violation class; exception DETAIL/HINT carrying row id + auth.uid(); booking_code added to bookings immutability guard), 4 strongly-recommended (SET search_path = public, pg_temp on all functions; CREATE OR REPLACE + DROP TRIGGER IF EXISTS for idempotency; commented rollback script in migration footer; trigger fire-order comment block on bookings). Deferred 5 (cross-table invariant bookings↔payments to Phase 7; total_amount immutability; pgTAP test harness; trip_id/customer_id immutability; admin escape-hatch as DBA procedure). Verdict: conditionally acceptable (now ready).
- Normalized user schema — profiles as single source of truth eliminates duplication
- Composite PK on junction tables — eliminates redundant surrogate keys
- JSONB permissions with GIN index — dynamic permissions, fast @> queries
- Dashboard seed data approach — pgcrypto extension unreliable in Supabase Dashboard SQL Editor
- 2026-04-11: **Seed data approach pivot** — pgcrypto extension for direct auth.users insertion has limitations in Supabase Dashboard SQL Editor. Pivoted to Dashboard-based user creation (manual via Authentication → Users), then seeding employees/user_roles with actual UUIDs. More reliable and documented in seed.sql header.
- Feature-Sliced Design v2.1 — scalable architecture with clear boundaries
- Dynamic roles — flexible permission without code changes
- JSON seat layouts — supports diverse vehicle types
- TanStack Query — server-state caching, no global state store needed
- Phase 1 split into 4 plans: scaffolding, shared UI, auth, app shell
- 2026-04-10: **Added Phase 2 (Database Foundation)** — Inserted between Foundation & Auth and feature phases. Establishes complete schema design, migrations, RLS policies, and triggers before any feature development. This prevents rework from schema changes and ensures data model consistency across all dependent phases. All subsequent phases (3-8) renumbered accordingly.
- 2026-04-10: Enterprise audit on 02-01-PLAN.md. Applied 1 must-have (UNIQUE employees.user_id for 1:1 enforcement), 3 strongly-recommended (CHECK roles.permissions JSONB array, UNIQUE employees.license_number, ON CONFLICT in handle_new_user trigger). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-03-PLAN.md. Applied 2 must-have (auth error mapping to Vietnamese, session loading flash prevention), 3 strongly-recommended (subscription cleanup pattern, double-submit prevention, AuthContextValue type export). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-01-PLAN.md. Applied 2 must-have (dark mode CSS vars, env validation), 3 strongly-recommended (error boundary, ESLint config clarity, cn utility path). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-02-PLAN.md. Applied 2 must-have (DataTable ColumnDef interface, CSS variable overwrite protection), 3 strongly-recommended (Toaster wiring, dayjs import fix, schema verification). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-04-PLAN.md. Applied 2 must-have (index.html in frontmatter, ROUTES constants for router paths), 4 strongly-recommended (NavLink ROUTES constants, logout error handling, body scroll lock, Escape key close). Verdict: conditionally acceptable (now ready)
- 2026-04-14: Enterprise audit on 03-01-PLAN.md. Applied 2 must-have (duplicate name 23505 handling, raw Supabase error suppression with mapSupabaseError), 4 strongly-recommended (Vietnamese Zod messages, DataTable actions column ColumnDef guidance, edit pre-fill serialization, seat_layout Zod refine strengthened). Deferred 4 (permission-gated UI, URL-synced pagination, server-side sort, seat layout structural schema). Verdict: conditionally acceptable (now ready).
- 2026-04-14: Enterprise audit on 03-02-PLAN.md. Applied 2 must-have (license_plate uppercase+trim normalization to match DB case-sensitive UNIQUE; vin_number blank/whitespace→null coercion), 9 strongly-recommended (DATE_REGEX on date fields + 22007 mapping; cross-field refine last≤next maintenance date; year upper bound via superRefine at validation time — not module load; current_mileage upper bound 10M; FK dropdown pageSize 1000 + visible truncation warning when count > data.length; auth-expiry 401/403/PGRST301 mapping; new AC-9 list-query error state with retry; new AC-10 dialog close guard during isPending; search debounce locked to 300ms). Deferred 7 (optimistic concurrency, created_by/updated_by columns — Phase 2 locked, status-transition FSM, plate regex, soft-delete, ARIA a11y, E2E tests). Verdict: conditionally acceptable (now ready). Flag: created_by/updated_by columns are the material residual compliance gap — address in a future schema-delta plan before GA.
- 2026-04-15: Enterprise audit on 04-01-PLAN.md. Applied 2 must-have (23505 constraint-specific check via `stations_name_key`/`details.(name)`; replace undefined `serializeFormDefaults` with explicit inline useEffect reset for both create/edit modes), 5 strongly-recommended (search trim before ilike; lat/lng type="text" for z.coerce.number; Controller for is_active Switch; edit→create mode reset; checkpoint regression steps). Deferred 3 (URL-synced filters; StationStatusBadge extraction; ARIA). Verdict: conditionally acceptable (now ready).
- 2026-04-14: Enterprise audit on 03-03-PLAN.md. Applied 1 must-have (23503 error message corrected for maintenance_logs INSERT FK violation — CASCADE means 23503 cannot occur on delete, message changed to "Xe không tồn tại hoặc đã bị xóa"), 7 strongly-recommended (performed_at default to today in create dialog; FK_DROPDOWN_PAGE_SIZE constant in list page filter; explicit cost '' → 0 coercion in serializeToInsert; AC-8 updated with specific 23503 message; npm run build added to verify; human-verify checkpoint steps added for AC-8 and AC-10; cost typed as number explicitly in MaintenanceLog interface). Deferred 6 (future-date warning, Zod max conservatism, odometer cross-field, description search, overdue indicator, server-side sort). Verdict: conditionally acceptable (now ready).

### Deferred Issues
- ARIA accessibility attributes (sidebar, header, mobile overlay) — deferred from 01-04 audit, must address before public/regulated deployment
- Focus trapping in mobile sidebar overlay — keyboard accessibility gap, deferred from 01-04 audit

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-04-15
Stopped at: 04-01 loop fully closed (PLAN ✓ APPLY ✓ UNIFY ✓); session paused before 04-02
Next action: /paul:plan (04-02 Routes CRUD — depends on @entities/station)
Resume file: .paul/HANDOFF-2026-04-15.md
Git strategy: master
Resume context:
- Plan 04-01 COMPLETE (created + audited): Stations CRUD — entity slice + list (name/city search + is_active filter) + form (lat/lng type=text, is_active Controller, inline reset useEffect) + delete + router wired
  → Must-have #1: mapSupabaseError 23505 uses stations_name_key + details.(name) check (not generic includes('name'))
  → Must-have #2: serializeFormDefaults removed — explicit useEffect reset for create (station===null) and edit (station!==null) modes
  → Key audit fixes: search trim before .or(); type="text" for lat/lng; Controller for Switch; regression steps in checkpoint
- Station DB: name+code UNIQUE; city NOT NULL; lat/lng CHECK; DELETE RESTRICT from routes+route_stops
- Phase 4 plan: 3 plans — 04-01 (Stations, ready), 04-02 (Routes, depends on @entities/station), 04-03 (Route Stops dnd-kit)
Git strategy: master
Resume context:
- Plan 03-03 COMPLETE (created + audited): Maintenance Logs CRUD — entity slice + list (vehicle/type filters) + form (FK dropdown, type select, cost, dates, odometer) + delete + type badge + router wired
  → 1 must-have applied: 23503 = INSERT FK violation only (CASCADE) → "Xe không tồn tại hoặc đã bị xóa"
  → Key audit fixes: performed_at default today; cost '' → 0 not null; cost: number type; FK_DROPDOWN_PAGE_SIZE constant; npm run build in verify; AC-8+AC-10 in checkpoint
- Entity template: src/entities/vehicle/ | Page template: src/pages/vehicles/
- No code written yet — plan + audit complete, APPLY not started
Git strategy: master
Resume context:
- Phase 2 COMPLETE: 13 migration files; 16 tables; RLS + integrity triggers
- Plan 03-01 COMPLETE: Vehicle Types CRUD + visual seat layout editor; FSD entity+page pattern established
  → Entity slice pattern (model/types → api/[name].api → api/[name].queries → index.ts) is the template
  → ColumnDef must be imported from @shared/ui/data-table (not barrel)
  → Use const { toast } = useToast() pattern (not standalone import)
- Plan 03-02 COMPLETE: Vehicles CRUD — entity slice + list (status filter + debounced search) + form (FK dropdown + status select) + delete + status badge + router wired
  → @entities/vehicle public API available: useVehicles, useVehicle, useCreateVehicle, useUpdateVehicle, useDeleteVehicle
  → mapSupabaseError extended: 401/403/PGRST301 auth-expiry + 22007 date format + license_plate/vin_number split 23505
  → serializeToInsert helper: centralizes '' → null coercion for nullable fields
  → FK dropdown pattern: FK_DROPDOWN_PAGE_SIZE=1000 + truncation warning when count > data.length
  → Dialog close guard: onOpenChange ignores close when isPending
  → List error state: isError → inline error + retry (not empty table)
  → superRefine patterns: year upper bound (runtime) + maintenance date cross-field ordering
- Plan 03-03: Maintenance Logs CRUD — depends on @entities/vehicle (useVehicles for FK dropdown)

---
*STATE.md — Updated after every significant action*
