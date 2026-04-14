# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-07-PLAN.md
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (upgraded to ready after applied fixes)

---

## 1. Executive Verdict

The plan correctly identifies the enforcement gaps left by 02-05 and 02-06 (set-once audit-trail immutability and bookings status FSM) and selects sound primitives (`BEFORE UPDATE` + `IS DISTINCT FROM` over `AFTER UPDATE` rollback). However, as initially drafted the plan ships with **three release-blocking gaps** and **four hardening gaps** that would not survive a SOC 2 / ISO review.

After applying 3 must-have + 4 strongly-recommended upgrades, the plan is **ready for APPLY**. Core architecture is unchanged; the upgrades strengthen observability, idempotency, and operational recovery.

**Would I sign my name to this system as applied? Yes.**

## 2. What Is Solid (Do Not Change)

- **BEFORE UPDATE + `IS DISTINCT FROM`** — correct enforcement primitive. Cheaper than AFTER-UPDATE rollback; naturally handles the NULL-ing attack.
- **Per-table trigger functions** — preserves per-table error specificity and avoids brittle dynamic column lookups; enables per-table SQLSTATE dispatch after fixes.
- **`WHEN` clause short-circuiting** on `OLD.<col> IS NOT NULL` — correct cost-control for the common pending-booking path.
- **Explicit scope boundaries** on tickets/payments FSMs and seat-availability helper — disciplined deferral to Phase 7 where lifecycle semantics will be known.
- **No modifications to locked migrations (01–06)** — respects phase boundaries.
- **Composite FK and partial unique index preservation** — the plan does not second-guess prior integrity design.

## 3. Enterprise Gaps Identified

### Gap 1 — Opaque exceptions (M1, must-have)
All raises use `errcode 'P0001'` (generic). Client code cannot distinguish violation classes without parsing English messages — brittle across i18n, log scrubbing, and future message tweaks. Fails SOC 2 requirement for machine-classifiable audit-relevant errors.

### Gap 2 — Missing row/actor identity in exceptions (M2, must-have)
Exception text reports old/new values but not the affected row PK or `auth.uid()`. Post-incident reconstruction can tell you *that* a violation occurred but not *for which row* or *by whom*.

### Gap 3 — `booking_code` unguarded (M3, must-have)
`booking_code` (BKG-NNNNN) is the customer-facing audit identifier printed on receipts/tickets. The plan guards `created_by`, `cancelled_at`, `cancelled_by` — but not `booking_code`. Any user with write permission could rewrite it silently, breaking the external audit chain.

### Gap 4 — No `search_path` pinning (S1, strongly recommended)
Functions lack `SET search_path = public, pg_temp`. Matches hardening already applied to `handle_new_user()` in 02-01; a free defense-in-depth win against schema-ordering hijacks.

### Gap 5 — Non-idempotent migration (S2, strongly recommended)
Uses `CREATE FUNCTION` / `CREATE TRIGGER` (fresh only). Re-applying the migration (after a partial deploy or operational replay) fails. `handle_updated_at()` uses `CREATE OR REPLACE` — this migration should match.

### Gap 6 — No documented rollback (S3, strongly recommended)
No recorded recovery procedure if a production incident requires emergency trigger removal or a legal correction requires bypassing immutability. Operational risk.

### Gap 7 — Trigger fire order undocumented (S4, strongly recommended)
Three BEFORE UPDATE triggers now coexist on `bookings`. The plan mentioned order in passing; without a committed migration comment block, a future rename could silently reorder behavior.

### Other observations (deferred)
- Cross-table invariant (`bookings.status='refunded'` ⇒ `payments.status='refunded'`) — known gap, defer to Phase 7 payments FSM.
- `total_amount` / `passenger_count` immutability after completion — not in this plan's audit-trail scope; defer.
- `trip_id` / `customer_id` immutability — composite FK already protects against drift; lower risk; defer.
- Automated pgTAP test harness — v0.1 manual test matrix is acceptable; revisit at project-wide test infra phase.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | Opaque P0001 exceptions cannot be classified by callers | AC-1, AC-2, AC-3 (new AC-5); Tasks 1/2/3 action blocks | Introduced distinct SQLSTATEs: FG001 (bookings audit), FG002 (tickets audit), FG003 (payments audit), FG004 (status transition). Added AC-5 requiring machine-classifiable errors. |
| M2 | Exceptions do not identify affected row or attempted actor | AC-1, AC-2, AC-3 (new AC-5); Tasks 1/2/3; Verification section | Every `raise exception` now uses `using detail = format('id=%s', NEW.id)` and `using hint = format('attempted_by=%s', auth.uid())`. Verification checklist updated to run with `\set VERBOSITY verbose` and assert DETAIL/HINT presence. |
| M3 | `booking_code` (customer-facing audit ID) could be silently rewritten | AC-1; Task 1; Verification section | Added `booking_code` to the guarded columns in `guard_bookings_audit_immutable`. AC-1 updated to include it. Added explicit verify step 5 in Task 1 and a line in the overall verification checklist. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Functions lack `search_path` pinning | Tasks 1, 2, 3; Verification section; Success criteria | Every function definition now includes `SET search_path = public, pg_temp`. Verification checklist updated to check this via `\df`. |
| S2 | Migration not idempotent — re-applying fails | Tasks 1, 2, 3 (all function DDL); new AC-6; Verification section | All functions use `CREATE OR REPLACE FUNCTION`. All triggers wrapped in `DROP TRIGGER IF EXISTS ... CREATE TRIGGER`. Added AC-6 requiring re-run to complete cleanly. Verification step added. |
| S3 | No documented rollback procedure | Task 3 footer comment block; Boundaries (operational notes); Verification | Added a commented-out rollback script block at the migration footer listing the full DROP sequence. Added operational note in boundaries explaining DBA-correction procedure. |
| S4 | Trigger fire order on `bookings` undocumented | Task 3 migration comment block | Added a `-- Trigger fire order on public.bookings` comment block committing the alphabetical ordering and warning against silent reorder via rename. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | Cross-table invariant (bookings.status='refunded' ⇒ payments.status='refunded') | Payments FSM is explicitly out of scope until Phase 7 (Customer, Ticketing & Payment). Known gap flagged in operational notes. |
| D2 | `total_amount` / `passenger_count` immutability after status=completed | Financial-close rules not yet formalized; not strictly audit-trail. Defer to Phase 7 or accounting-integration phase. |
| D3 | Automated test harness (pgTAP) | Project-wide test infra investment; manual SQL test matrix is acceptable for v0.1. Revisit when test infra phase lands. |
| D4 | `trip_id` / `customer_id` immutability on bookings | Composite FK already prevents trip-drift via tickets; customer_id change is a legitimate corrective op. Lower priority. |
| D5 | Admin escape-hatch for audit correction | Documented as DBA-operated trigger-drop in boundaries/operational-notes. No code needed; procedural control is sufficient. |

## 5. Audit & Compliance Readiness

**Evidence:** Strong after fixes. Every violation produces a distinct SQLSTATE, a row identifier, and an actor identifier — sufficient for SOC 2 audit-log reconstruction.

**Silent failure prevention:** Strong. All integrity violations raise and roll back the transaction; nothing is silently accepted or coerced.

**Post-incident reconstruction:** Adequate after M2. Exception logs now tie a violation to a specific row and actor. Combined with Supabase's request logs (which capture the JWT / auth context), full attribution is possible.

**Ownership / maintainability:** Clear. All new objects are in `public` schema, named consistently, commented. Trigger fire order is now committed in-migration.

**Would fail an audit before fixes due to:** opaque error codes (can't classify), missing row/actor in exceptions (can't reconstruct), and unguarded `booking_code` (customer-visible audit identifier).

## 6. Final Release Bar

**What must be true before this plan ships (all met after fixes):**
- Distinct SQLSTATEs per violation class — ✅ applied.
- Every exception carries affected row PK + attempted actor in DETAIL/HINT — ✅ applied.
- `booking_code` is set-once — ✅ applied.
- Functions harden `search_path` — ✅ applied.
- Migration is idempotent (safe to re-apply) — ✅ applied.
- Rollback procedure is documented in-migration — ✅ applied.
- Trigger fire order is committed in-migration — ✅ applied.

**Remaining risks if shipped as-is after fixes:**
- Cross-table booking/payment status coherence is not enforced — known, tracked, and mitigated by application-level workflow until Phase 7 closes it.
- No automated regression tests — mitigated by documented manual test matrix; accept for v0.1.

**Would I sign my name to this system?** Yes — after the applied upgrades. The plan now meets the bar for enterprise-defensible set-once audit trails and FSM enforcement at the database level.

---

**Summary:** Applied 3 must-have + 4 strongly-recommended upgrades. Deferred 5 items (all documented).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
