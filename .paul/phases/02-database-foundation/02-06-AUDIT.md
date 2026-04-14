# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-06-PLAN.md
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (now ready after applying upgrades)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan's core architecture — dynamic permission checking via SECURITY DEFINER helpers, two-tier access classification, and zero hardcoded role names — is sound and aligned with the project's RBAC design. However, three gaps required remediation before this plan meets enterprise audit standards:

1. Audit-attribution columns on INSERT were unprotected (staff could impersonate another user)
2. Helper functions were callable by the anon role (unnecessary attack surface)
3. Function calls in policy expressions were not schema-qualified (search_path manipulation risk)

All three have been applied to the plan. With these upgrades, I would approve this for production if I were accountable.

## 2. What Is Solid (Do Not Change)

**Dynamic permission model via SECURITY DEFINER helpers:**
The `has_permission(text)` → `user_roles` JOIN `roles.permissions @>` pattern is the correct approach for Supabase dynamic RBAC. SECURITY DEFINER with `SET search_path = public` follows the same hardened pattern established by `handle_new_user()`. Zero hardcoded role names means permission changes never require migration deployments.

**Two-tier access classification:**
Separating reference tables (open SELECT to all authenticated) from domain tables (permission-gated) is architecturally correct. Reference data like routes, stations, and vehicle_types has no sensitivity and is required for UI joins across all roles. Gating these would create cascading permission failures in the frontend.

**Self-access patterns:**
Profiles (auth.uid() = id), employees (user_id = auth.uid()), and trip_staff (employee subquery) provide the minimum viable self-service access without over-granting. The trip_staff subquery is defense-in-depth — drivers already have trips:read, but the self-access pattern survives permission changes.

**DELETE restricted to is_admin():**
Correct safety net. Hard deletes should be rare in a system with status-based soft deletes, and restricting them to admin prevents accidental data loss from lower-privileged roles.

**FORCE ROW LEVEL SECURITY:**
Including both ENABLE and FORCE RLS is critical. Without FORCE, table owners (the migration role) bypass RLS. This is often missed.

**STABLE volatility marking:**
Correctly noted. Since `has_permission()` and `is_admin()` don't reference row columns, PostgreSQL's planner can evaluate them once per query rather than per-row. This mitigates the performance concern of per-row subqueries.

## 3. Enterprise Gaps Identified

### Gap 1: Audit-Attribution Columns Unprotected on INSERT (CRITICAL)

**Risk:** The bookings, tickets, and payments tables have audit-attribution columns (`created_by`, `issued_by`, `processed_by`) that record which staff member performed the action. The original plan's INSERT policies only checked `has_permission()` — they did not constrain WHO the attribution pointed to. A malicious or careless staff member could INSERT a booking with `created_by` set to another user's UUID, falsifying the audit trail.

**Impact:** In a regulated or audited environment, this undermines non-repudiation. An SOC 2 auditor would flag this as a control failure: "who created this record?" is unanswerable if the field can be freely set.

**Classification:** Must-have (release-blocking)

### Gap 2: Helper Functions Callable by Anon Role (MODERATE)

**Risk:** PostgreSQL functions default to EXECUTE granted to PUBLIC. The `has_permission()` and `is_admin()` functions are SECURITY DEFINER — they query `user_roles` and `roles` as the function owner. While `auth.uid()` returns NULL for anon connections (so the functions return false), allowing anon to execute SECURITY DEFINER functions is unnecessary attack surface. A future bug in the function logic could be exploited by unauthenticated callers.

**Impact:** Low immediate risk (functions return false for anon), but defense-in-depth requires eliminating unnecessary privileges.

**Classification:** Strongly recommended

### Gap 3: Unqualified Function Calls in Policy Expressions (MODERATE)

**Risk:** If policy expressions use `has_permission()` instead of `public.has_permission()`, a user with CREATE privilege in another schema could create a same-named function that resolves first via search_path. The SECURITY DEFINER function bodies are protected by `SET search_path = public`, but the policy expression evaluation context uses the session's search_path.

**Impact:** Low probability in Supabase (users don't typically have CREATE on other schemas), but schema-qualification is a zero-cost hardening measure.

**Classification:** Strongly recommended

### Gap 4: cancelled_by Enforcement on UPDATE (KNOWN DEFERRAL)

**Risk:** When a booking is cancelled, `cancelled_by` should be set to the current user. RLS WITH CHECK cannot cleanly enforce column-level change detection (it validates the entire new row state, not which columns changed). A user with `bookings:write` could theoretically set `cancelled_by` to another user on UPDATE.

**Impact:** Mitigated by 02-07 immutability triggers, which will prevent overwriting once set. The gap exists only in the interim between 02-06 and 02-07.

**Classification:** Can safely defer (02-07 addresses this directly)

### Gap 5: JWT-Claim-Based Permission Caching (PERFORMANCE)

**Risk:** Each `has_permission()` call executes a JOIN query against `user_roles` and `roles`. While STABLE marking helps the planner, high-frequency queries against large tables could show latency. The alternative — extracting permissions into JWT custom claims via a Supabase hook — would make permission checks in-memory.

**Impact:** Unlikely to matter at MVP scale. Becomes relevant at 100+ concurrent users with complex policies.

**Classification:** Can safely defer (optimize if measured)

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Audit-attribution columns unprotected on INSERT | Task 2 action, Task 2 verify, Task 3 action/verify, AC section, Verification section | Added WITH CHECK constraints requiring `created_by/issued_by/processed_by IS NULL OR = auth.uid()` on bookings/tickets/payments INSERT policies. Added AC-5 for audit-attribution enforcement. Added verification check #7 in Task 2, check #6 in Task 3. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Helper functions callable by anon | Task 1 action, Task 1 verify, Task 3 action/verify, AC section | Added REVOKE EXECUTE FROM PUBLIC + GRANT TO authenticated for both functions. Added AC-6. Added verify checks in Task 1 and Task 3. |
| 2 | Unqualified function calls in policies | Task 2 action, Task 2 verify, Task 3 action/verify | Added explicit instruction to schema-qualify all `public.has_permission()` and `public.is_admin()` calls. Added verify check #8 in Task 2, check #7 in Task 3. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | cancelled_by enforcement on UPDATE | 02-07 immutability triggers will prevent overwriting audit-trail columns once set. RLS WITH CHECK cannot cleanly detect column-level changes. |
| 2 | JWT-claim-based permission caching | STABLE function optimization sufficient at MVP scale. Only relevant at 100+ concurrent users. Would require Supabase Auth hook configuration (architectural change). |

## 5. Audit & Compliance Readiness

**Audit evidence:** The WITH CHECK constraints on audit-attribution columns ensure non-repudiation — every record's creator is provably the authenticated user. Combined with Supabase Auth JWTs, this produces a defensible chain: auth token → auth.uid() → RLS WITH CHECK → column value.

**Silent failure prevention:** FORCE ROW LEVEL SECURITY eliminates the most common silent RLS bypass (table owner access). Schema-qualified function calls prevent search_path manipulation. REVOKE from PUBLIC prevents unexpected anon access to SECURITY DEFINER functions.

**Post-incident reconstruction:** All domain tables are permission-gated. Combined with Supabase's built-in audit log (pg_stat_statements, auth logs), investigators can reconstruct: who authenticated, what permissions they had (via user_roles snapshot), and what data they accessed/modified.

**Ownership and accountability:** The `is_admin()` gate on DELETE operations ensures only admins can permanently remove data. Audit-trail columns (`created_by`, `issued_by`, `processed_by`) are now enforced at the database level, not just application level.

**Remaining gap:** Column-level UPDATE protection for audit-trail columns is deferred to 02-07. Between 02-06 and 02-07 deployment, a user with write permission could overwrite `cancelled_by` on a booking they didn't cancel. This is a time-bounded risk that closes when 02-07 ships.

## 6. Final Release Bar

**What must be true before this plan ships:**
- All 16 tables have RLS enabled AND forced
- Helper functions are SECURITY DEFINER with REVOKE from PUBLIC
- All policy expressions use schema-qualified function calls
- Audit-attribution INSERT policies use WITH CHECK
- Zero hardcoded role names anywhere in policy definitions

**Risks if shipped as-is (with upgrades applied):**
- cancelled_by/refunded_at can be manipulated on UPDATE until 02-07 deploys (low risk: requires write permission + malicious intent)
- Permission checks hit the database per-query (acceptable at MVP scale; monitor if latency appears)

**Sign-off:** With the three upgrades applied, this plan meets enterprise RLS standards for a Supabase-backed application. The dynamic permission model is well-designed, the self-access patterns are correct, and the audit-attribution controls close the most critical gap. I would sign my name to this system.

---

**Summary:** Applied 1 must-have + 2 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
