---
phase: 02-database-foundation
plan: 06
subsystem: database
tags: [postgresql, rls, row-level-security, supabase, authorization, jsonb, permissions]

requires:
  - phase: 02-01
    provides: profiles, roles, user_roles, employees tables + JSONB permissions column on roles
  - phase: 02-02
    provides: vehicle_types, vehicles, maintenance_logs tables
  - phase: 02-03
    provides: stations, routes, route_stops tables
  - phase: 02-04
    provides: trips, trip_staff tables
  - phase: 02-05
    provides: customers, bookings, tickets, payments tables + audit-trail columns

provides:
  - RLS enabled and forced on all 16 public tables
  - has_permission(text) SECURITY DEFINER helper function
  - is_admin() SECURITY DEFINER helper function
  - 63 named RLS policies covering SELECT/INSERT/UPDATE/DELETE on all tables
  - Audit-attribution enforcement via WITH CHECK on bookings/tickets/payments INSERT

affects: [03-vehicle-management, 04-route-station-management, 05-employee-management, 06-trip-management, 07-booking, all feature phases]

tech-stack:
  added: []
  patterns:
    - SECURITY DEFINER helpers for RLS to bypass bootstrapping problem
    - Two-tier access model: reference tables open to authenticated, domain tables permission-gated
    - Schema-qualified function calls in policies (public.has_permission, public.is_admin)
    - REVOKE/GRANT on helper functions to block anon role

key-files:
  created:
    - supabase/migrations/20260414110000_rls_helpers.sql
    - supabase/migrations/20260414110001_rls_policies.sql
  modified: []

key-decisions:
  - "SECURITY DEFINER on helper functions: allows RLS policies to read user_roles/roles without circular dependency"
  - "Two access tiers: reference tables (SELECT open), domain tables (SELECT permission-gated)"
  - "Self-access patterns: profiles by id=auth.uid(), employees by user_id=auth.uid(), trip_staff via employee subquery"
  - "is_admin() as DELETE guard on all tables — hard-delete requires admin, soft-delete via status is the norm"
  - "Audit-attribution WITH CHECK: created_by/issued_by/processed_by must be NULL or auth.uid() on INSERT"

patterns-established:
  - "All policy expressions use public.has_permission() or public.is_admin() — zero hardcoded role names"
  - "Policy naming: {table}_{operation}_{scope}"
  - "TO authenticated on every policy — no anon access anywhere"
  - "FORCE ROW LEVEL SECURITY ensures table owners cannot bypass"

duration: ~30min
started: 2026-04-14T11:00:00Z
completed: 2026-04-14T11:30:00Z
---

# Phase 2 Plan 06: RLS Policies & Security Summary

**RLS enabled on all 16 public tables with 63 named policies using dynamic permission checks via JSONB `@>` lookups through SECURITY DEFINER helpers — zero hardcoded role names.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-04-14 |
| Completed | 2026-04-14 |
| Tasks | 3 of 3 completed |
| Files created | 2 |
| Files modified | 0 (locked files untouched) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: RLS Helper Functions | Pass | `has_permission(text)` + `is_admin()` — SECURITY DEFINER, STABLE, JSONB `@>` checks |
| AC-2: RLS Enabled on All Tables | Pass | 16 ENABLE + 16 FORCE ROW LEVEL SECURITY |
| AC-3: Permission-Gated Access | Pass | All domain tables use `public.has_permission()` — fleet_manager cannot see bookings |
| AC-4: Self-Access Patterns | Pass | profiles own row, employees own record, trip_staff via employee subquery, reference tables open |
| AC-5: Audit-Attribution Enforcement | Pass | bookings `created_by`, tickets `issued_by`, payments `processed_by` — WITH CHECK on INSERT |
| AC-6: Helper Function Access Control | Pass | REVOKE EXECUTE from PUBLIC, GRANT to authenticated on both helpers |

## Accomplishments

- Created `has_permission(text)` and `is_admin()` as SECURITY DEFINER helpers — the JSONB `@>` approach means permission names are data (in `roles.permissions`), not hardcoded in SQL
- Implemented a two-tier policy architecture: 7 reference tables with open SELECT, 9 domain tables fully permission-gated
- Enforced audit-attribution at the database layer — staff cannot INSERT bookings/tickets/payments attributed to other users
- Blocked helper function access to anon role entirely — `REVOKE EXECUTE FROM PUBLIC` ensures no permission-check surface for unauthenticated callers

## Task Commits

No atomic commits per task — both migration files were created in the same APPLY session. To be committed in the UNIFY git commit.

| Task | Status | Qualify |
|------|--------|---------|
| Task 1: RLS helper functions | Done | PASS |
| Task 2: RLS policies for 16 tables | Done | PASS |
| Task 3: Verify completeness | Done | PASS (8/8 checks) |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260414110000_rls_helpers.sql` | Created | SECURITY DEFINER helpers: `has_permission(text)`, `is_admin()` + REVOKE/GRANT |
| `supabase/migrations/20260414110001_rls_policies.sql` | Created | 63 RLS policies across 16 tables — ENABLE + FORCE + named CREATE POLICY statements |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| SECURITY DEFINER on helpers | Without it, RLS on `user_roles`/`roles` would block the permission lookup — circular dependency | Helpers can always read roles regardless of caller's own permissions |
| Self-update for employees: SELECT only | Prevents employees from changing sensitive fields (user_id, is_active, hire_date) via PostgREST; permission holders manage all writes | Simpler policy, avoids column-level WITH CHECK complexity deferred to future |
| `trip_staff` self-access via subquery | Resolves `auth.uid() → employee_id → trip_staff.employee_id` — drivers/assistants see their own assignments without explicit `trips:read` | Defense-in-depth: works even if role misconfigured |
| `cancelled_by` enforcement deferred | Column-level change detection (only reject if cancelled_by changes) cannot be cleanly expressed in RLS WITH CHECK alone | Deferred to 02-07 immutability triggers |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Correctness fix — no scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | Plan-specified deferrals only |

**Total impact:** One essential correctness fix, no scope creep.

### Auto-fixed Issues

**1. NULL return for unauthenticated callers in helper functions**
- **Found during:** Task 1 qualify (DONE_WITH_CONCERNS)
- **Issue:** Original draft used `WHERE auth.uid() IS NOT NULL` as outer clause on the SQL function body. When `auth.uid()` is NULL, this makes the SELECT return 0 rows, causing the function to return NULL (not `false`)
- **Fix:** Removed the outer WHERE clause. `EXISTS(... WHERE user_id = auth.uid())` correctly returns `false` when `auth.uid()` is NULL because `NULL = UUID` is never true in SQL
- **Files:** `supabase/migrations/20260414110000_rls_helpers.sql`
- **Verification:** Re-read file; EXISTS always returns true/false, never NULL

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| NULL vs false return for anon callers | Auto-fixed (see deviations — used EXISTS natural NULL-equality behavior) |

## Next Phase Readiness

**Ready:**
- All 16 tables are RLS-protected — PostgREST API is locked down, no open data exposure
- Dynamic permission model is live — adding new role permissions in `roles.permissions` JSONB automatically extends access without policy changes
- `has_permission()` and `is_admin()` are available for use in any future triggers or functions that need to check caller permissions

**Concerns:**
- `cancelled_by` field on bookings is not yet immutable — a user with `bookings:write` could UPDATE a cancelled booking's `cancelled_by` to another user. Deferred to 02-07
- No audit log for RLS denials — PostgREST returns empty result sets on policy block, not errors. Consider logging if compliance needed (future phase)

**Blockers:**
- None. 02-07 (Triggers & Database Functions) can proceed immediately.

---
*Phase: 02-database-foundation, Plan: 06*
*Completed: 2026-04-14*
