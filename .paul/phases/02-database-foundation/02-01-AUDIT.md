# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-01-PLAN.md
**Audited:** 2026-04-10
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — upgraded to ready after applying fixes.**

The plan demonstrates strong database architecture: normalized schema with profiles as single source of truth, composite PK on junction table, GIN index on JSONB, SECURITY DEFINER with search_path, idempotent operations throughout. The prior review cycle already addressed the major concerns (data duplication, surrogate key, security, idempotency).

This audit found 1 data integrity gap and 3 defensive improvements — all have been applied.

## 2. What Is Solid

- **Normalized schema:** profiles is the single source of truth for user data. employees stores only employment-specific fields. Eliminates sync ambiguity.
- **Composite PK on user_roles:** No redundant surrogate key. The (user_id, role_id) pair is the natural key. Storage-efficient, index-efficient.
- **GIN index on roles.permissions:** Enables `@>` containment queries without full-table scans. Correct index type for JSONB.
- **SECURITY DEFINER with SET search_path = public:** The handle_new_user() trigger correctly locks down the search path to prevent injection.
- **Idempotent design throughout:** Role inserts use ON CONFLICT (name) DO NOTHING. Seed data uses ON CONFLICT DO NOTHING on all inserts. Deterministic UUIDs in seed data enable cross-referencing.
- **Seed data architecture:** Creates auth.users → triggers auto-create profiles → inserts employees and user_roles. Full login-ready accounts with Vietnamese context. Separate from migrations.
- **Proper FK cascade strategy:** profiles→auth.users CASCADE (user deleted = profile deleted), employees→profiles SET NULL (user deleted = employee preserved as historical record).

## 3. Enterprise Gaps Identified

1. **Missing UNIQUE on employees.user_id:** PROJECT.md data model states `Users ↔ Employees (1:1)`, but the database had no constraint enforcing this. A bug in application code could create multiple employee records for the same user, violating the stated data model and causing unpredictable query results.

2. **Missing CHECK on roles.permissions JSONB type:** The permissions column defaults to `'[]'::jsonb` (array) but had no type validation. PostgreSQL accepts any JSONB — a string like `'"admin"'`, an object, or null would be silently stored. The GIN index and application code both assume array format. A malformed value would cause runtime errors in permission checks with no clear root cause.

3. **Missing UNIQUE on employees.license_number:** In a real fleet management system, two employees should never share the same license number. The column was nullable (correct — office staff don't drive) but had no uniqueness constraint. PostgreSQL UNIQUE allows multiple NULLs, so nullable behavior is preserved.

4. **handle_new_user() trigger not defensive against existing profiles:** If a profile row already exists for a user ID (e.g., admin manually created it, or from a previous partial setup), the trigger's INSERT would fail with a duplicate key error. This would block the auth.users INSERT entirely — the signup would fail with no user-facing explanation.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | employees.user_id lacks UNIQUE — violates 1:1 data model | Task 1 (employees table), AC-1, verification | Added `unique` to user_id column definition, updated comment, updated AC-1 and verification checklist |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | roles.permissions accepts non-array JSONB | Task 1 (roles table), AC-1, verification | Added `check (jsonb_typeof(permissions) = 'array')` constraint, updated AC-1 and verification checklist |
| 2 | employees.license_number allows duplicates | Task 1 (employees table), verification | Added `unique` to license_number column definition, added comment |
| 3 | handle_new_user() trigger fails if profile exists | Task 2 (trigger function) | Added `on conflict (id) do nothing` to the INSERT in handle_new_user() |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | seed.sql has no programmatic guard to verify migrations ran first | The README documents execution order, and the checkpoint verifies correct sequence. Adding a guard would require dynamic SQL or error handling that reduces readability of the seed file. |

## 5. Audit & Compliance Readiness

- **Data integrity:** UNIQUE constraints enforce 1:1 (profiles↔employees) and prevent duplicate licenses. CHECK constraint validates JSONB structure. Acceptable.
- **Audit trail:** updated_at triggers on all tables provide modification timestamps. profiles auto-created on signup provides user creation traceability. Acceptable.
- **Security:** SECURITY DEFINER with SET search_path = public on trigger function. ON CONFLICT DO NOTHING prevents trigger failures from blocking signups. Acceptable.
- **Silent failure prevention:** CHECK constraint prevents invalid JSONB types from being silently stored. UNIQUE constraints prevent duplicate relationships. Acceptable.

## 6. Final Release Bar

**What must be true before this plan ships:**
- All 4 constraints applied (UNIQUE employees.user_id, UNIQUE employees.license_number, CHECK roles.permissions, ON CONFLICT in trigger)
- Human verifies migration applied to Supabase with all tables, constraints, indexes, and triggers
- Seed data loads cleanly with 9 login-ready accounts

**Remaining risks:**
- RLS policies not yet implemented (plan 02-06) — tables are accessible to all authenticated users until policies are added. Acceptable for Phase 2 sequential execution.
- Seed auth.users INSERT may need column adjustments for different Supabase versions — checkpoint will catch this.

**Would I sign my name to this schema?** Yes, for a foundation layer. The constraints, indexes, and trigger security are production-grade.

---

**Summary:** Applied 1 must-have + 3 strongly-recommended upgrades. Deferred 1 item.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
