# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-10)

**Core value:** Digitize and automate passenger coach fleet management into a single source of truth
**Current focus:** Phase 7 — Customer, Ticketing & Payment

## Current Position

Milestone: v0.1 MVP
Phase: 7 of 8 (Customer, Ticketing & Payment) — In Progress
Plan: 07-03 complete
Status: UNIFY complete, ready for next PLAN
Last activity: 2026-04-16 — Closed loop for 07-03 (Seat Map, QR & Ticket Operations)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - ready for next PLAN]
```

Progress:
- Milestone: [██████░░░░] 75% (6 of 8 phases complete)
- Phase 7: [████░░░░░░] 75% (3 of 4 plans complete, 07-04 pending)

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
- 2026-04-15: Enterprise audit on 04-02-PLAN.md. Applied 2 must-have (parseDurationMinutes fallback→1 + multi-day interval format; mapSupabaseError 23503 split by operation context 'mutate'|'delete'), 4 strongly-recommended (23514 mapping added; serializeToInsert Math.max(1) clamp; Route type collision explicit resolution in router.tsx; npm run build added to human-verify checkpoint). Deferred 5 (permission-gated UI; URL filters; server-sort; ISO 8601 interval; optimistic concurrency). Verdict: conditionally acceptable (now ready).
- 2026-04-15: Enterprise audit on 05-01-PLAN.md. Applied 1 must-have (mapRoleError 23505 uses details.(name) not generic msg.includes('name')), 5 strongly-recommended (search trim; permission Zod regex; AC-3 edit toast; auth-expiry PGRST301/401/403; 23514 CHECK mapping; regression checkpoint step). Deferred 4. Verdict: conditionally acceptable (now ready).
- 2026-04-15: Enterprise audit on 05-02-PLAN.md. Applied 3 must-have (mapEmployeeError uses .code field not msg.includes for SQLSTATE; split try/catch for partial-save; useEmployeeRole useEffect undefined guard), 3 strongly-recommended (auth-expiry PGRST301/401/403 mapping; profiles truncation warning; regression checkpoint steps for router.tsx). Deferred 5. Verdict: conditionally acceptable (now ready).
- 2026-04-15: Phase 5 complete — Roles CRUD (05-01) + Employees CRUD with profiles JOIN, license expiry alerts, user_roles assignment (05-02) delivered. Two auto-fixes: Radix Select __none__ sentinel; duplicate ColumnDef key resolved.
- 2026-04-16: Enterprise audit on 06-01-PLAN.md. Applied 2 must-have (toDatetimeLocal timezone fix — iso.slice(0,16) shows UTC not local time; z.preprocess for price_override — z.coerce.number() coerces null→0 silently creating free trips), 5 strongly-recommended (datetime format regex; TripImport→TripInsert typo; AC-6 list error state; use formatDateTime from shared lib; regression checkpoint step). Deferred 2 (timezone-aware date range filtering; formatCurrency null edge case). Verdict: conditionally acceptable (now ready).
- 2026-04-16: Enterprise audit on 06-02-PLAN.md. Applied 1 must-have (error mapper uses `message` not `details` for 23505 constraint name discrimination — constraint name is in PostgreSQL `message` field, `details` contains key/value pairs only), 4 strongly-recommended (driver-already-exists pre-check before Add click; read-only mode for completed/cancelled trips; useEffect reset on trip change; staff list loading state). Deferred 2 (driver removal confirmation; employee name fallback). Verdict: conditionally acceptable (now ready).
- 2026-04-16: Plan 06-02 execution — Fixed Supabase query for trip-staff entity: added `user_id` field to employee join (`employee:employees(id, user_id, is_active, profiles(...))`) for proper profile relationship resolution through auth.users. Without `user_id`, nested join to profiles returned null, causing "N/A" display in dropdown and staff list.
- 2026-04-16: Enterprise audit on 06-03-PLAN.md. Applied 1 must-have (PGRST116 catch for employee `.single()` — prevents crash when user has no employee record), 4 strongly-recommended (auth-expiry 401/403/PGRST301 handling on both pages; today cell highlight in calendar grid; full-date grouping instead of day-number-only; client-side sort as primary for fetchMySchedule). Deferred 2 (URL-synced calendar month; calendar trip click-through). Verdict: conditionally acceptable (now ready).
- 2026-04-16: **Phase 6 complete** — Trip Scheduling phase delivered with Trip CRUD (06-01), Staff Assignment with conflict validation (06-02), and Calendar View + My Schedule (06-03). All placeholder routes replaced with functional pages. Auto-fix: Sidebar active state now uses exact matching (end: true) to prevent false positives between /trips and /trips/calendar.
- 2026-04-16: Enterprise audit on 07-01-PLAN.md. Applied 2 must-have (phone_number trim in serializeToInsert — prevents UNIQUE bypass; email/id_card_number empty→null flagged as correctness-critical for UNIQUE nullable columns — PostgreSQL allows multiple NULLs but rejects multiple empty strings), 8 strongly-recommended (phone regex validation; id_card_number trim; date_of_birth future date guard; gender Select uses DB values directly; search trim before ilike; auth-expiry on list page; AC-6 strengthened; npm run build in Task 3 verify). Deferred 3. Verdict: conditionally acceptable (now ready).
- 2026-04-15: Enterprise audit on 04-03-PLAN.md. Applied 3 must-have (hasInitializedRef guard for background refetch race condition; SortableStopRow at module level not inline; z.preprocess for empty-string→null on optional numeric fields), 4 strongly-recommended (useRef not useId; Hủy button resets form; mapRouteStopError context='save' for non-atomic save risk; keyboard DnD step in checkpoint). Deferred 3 (station name loading state; saveRouteStops non-atomicity comment; stop row display formatting). Verdict: conditionally acceptable (now ready).
- 2026-04-14: Enterprise audit on 03-03-PLAN.md. Applied 1 must-have (23503 error message corrected for maintenance_logs INSERT FK violation — CASCADE means 23503 cannot occur on delete, message changed to "Xe không tồn tại hoặc đã bị xóa"), 7 strongly-recommended (performed_at default to today in create dialog; FK_DROPDOWN_PAGE_SIZE constant in list page filter; explicit cost '' → 0 coercion in serializeToInsert; AC-8 updated with specific 23503 message; npm run build added to verify; human-verify checkpoint steps added for AC-8 and AC-10; cost typed as number explicitly in MaintenanceLog interface). Deferred 6 (future-date warning, Zod max conservatism, odometer cross-field, description search, overdue indicator, server-side sort). Verdict: conditionally acceptable (now ready).
- 2026-04-16: Enterprise audit on 07-02-PLAN.md. Applied 3 must-have (compensating transaction for non-atomic booking+ticket creation — delete orphaned booking on ticket failure; price default uses trip.price_override ?? route.base_price precedence; cancel payment sync splits 'completed'→'refunded' and 'pending'→'failed'), 7 strongly-recommended (trip status filter for creation dropdown — only scheduled/in_progress; search trim before ilike; FK dropdown FK_DROPDOWN_PAGE_SIZE + truncation warning; 23514 CHECK mapping with explicit Vietnamese text; double-booking race condition documented as expected; close guard skipped during isPending; npm run build in Task 2 verify). Deferred 5 (optimistic concurrency, Supabase RPC atomicity, confirmation workflow, permission-gated UI, URL-synced filters). Verdict: conditionally acceptable (now ready).
- 2026-04-16: Enterprise audit on 07-03-PLAN.md. Applied 2 must-have (TicketInsert type must include qr_code — remove from Omit list for TypeScript compilation; context-aware PGRST116 error mapping — 'lookup' vs 'check-in' contexts produce distinct Vietnamese messages), 5 strongly-recommended (seat_layout runtime validation for malformed JSONB; cancelled/refunded booking warning banner + disabled check-in buttons + new AC-2b; bulk check-in confirm() dialog; TicketQrDialog tripInfo prop for print display; explicit check-in loading state specification). Deferred 4 (QR predictability, seat numbering >26 rows, permission-gated UI, webcam QR scanning). Verdict: conditionally acceptable (now ready).
- 2026-04-16: **Plan 07-03 executed** — Seat Map, Check-in Page, and QR Code features delivered. SeatMap component supports multi-floor layouts with runtime validation. Check-in page with context-aware error mapping and cancelled booking guards. QR codes generated deterministically on ticket creation. All acceptance criteria met. Build passes with zero errors.
- 2026-04-16: **Loop 07-03 closed** — Auto-fix applied for PostgREST PGRST201 relationship ambiguity. Added explicit FK constraint `!tickets_booking_id_fkey` to booking detail and check-in queries to resolve composite FK ambiguity between bookings and tickets tables.

### Deferred Issues
- ARIA accessibility attributes (sidebar, header, mobile overlay) — deferred from 01-04 audit, must address before public/regulated deployment
- Focus trapping in mobile sidebar overlay — keyboard accessibility gap, deferred from 01-04 audit

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-04-16
Stopped at: Session paused with WIP committed to main
Next action: Resume with /paul:progress or /paul:plan for 07-04
Resume file: .paul/HANDOFF-2026-04-16.md
Git strategy: main (commit: 534ab3c)
Resume context:
- Phase 7 in progress: Customer, Ticketing & Payment
- Plans 07-01, 07-02, 07-03 complete; 07-04 Payment Management pending
- SeatMap component, Check-in page, and QR code features delivered in 07-03
- Auto-fix applied: PostgREST PGRST201 FK ambiguity resolved
- Build passes with zero errors
- Enterprise audit enabled

---
*STATE.md — Updated after every significant action*
