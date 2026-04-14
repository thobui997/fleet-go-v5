# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-vehicle-management/03-02-PLAN.md
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (now ready — all must-have + strongly-recommended findings applied)

---

## 1. Executive Verdict

**Conditionally acceptable** — the plan is structurally sound, mirrors the 03-01 entity+page pattern faithfully, scopes boundaries tightly, and has a working error-mapping discipline. However, several enterprise-grade gaps were present in the original draft that would have produced latent data-integrity and UX failures in production:

- Case-sensitive unique index on `license_plate` combined with un-normalized input would silently fail application-level duplicate detection.
- `vin_number` blank handling was ambiguous between empty string and null, with a UNIQUE column that interprets those differently.
- Date fields accepted arbitrary strings, offloading validation to Postgres and risking raw-error leakage.
- No list-query error state; no guard against dialog close during in-flight mutation; no handling for auth expiry.
- Year-upper-bound validation was evaluated at module load — stale across year rollover for long-running admin sessions.

With the must-have (2) and strongly-recommended (9) findings applied, I would sign my name to this plan for a back-office admin panel in a regulated transportation environment.

## 2. What Is Solid

- **FSD discipline:** entity slice strictly imports only from `@entities/vehicle-type`; page slice imports only from entities. Explicit boundaries section protects 03-01's frozen surface. Correct.
- **Error-mapping pattern reuse:** mapSupabaseError with distinct PG codes (23505/23503/23514) is appropriate for a Supabase-direct client pattern — no raw DB strings in the UX.
- **Dependency modeling:** `depends_on: ["03-01"]` is a genuine dependency (consumes `useVehicleTypes`), not reflexive chaining.
- **Await-then-close mutation pattern:** Already encoded from 03-01; dialog stays open on error so user can correct.
- **Scope limits are honest:** Explicitly defers status FSM, soft-delete, permission-gated UI, optimistic concurrency — avoids scope creep.
- **FK RESTRICT error path acknowledged:** The plan honors that deletion will be blocked by future trips / maintenance_logs rows and maps 23503 accordingly.

## 3. Enterprise Gaps Identified

Full list of non-obvious risks present in the original draft:

1. **M1 — license_plate casing:** DB UNIQUE index is case-sensitive. Without frontend normalization (uppercase + trim), "51a-12345" and "51A-12345" both land as distinct rows, breaking AC-6 uniqueness at the application layer.
2. **M2 — vin_number empty vs whitespace:** Original schema coerced "empty string to null" but didn't handle whitespace-only input. "" and " " both serialize to "real" strings that fail UNIQUE on second submit.
3. **S1 — date format validation:** `<input type="date">` usually returns YYYY-MM-DD, but browsers with non-standard locales, paste, or keyboard input can produce arbitrary strings. Original plan offloaded this to Postgres 22007. Raw PG messages leak; Vietnamese UX breaks.
4. **S2 — cross-field date order:** `next_maintenance_date < last_maintenance_date` is nonsensical data. No refine.
5. **S3 — year upper bound module-load staleness:** `new Date().getFullYear() + 1` evaluated at module load. Admin panels stay open across midnight / New Year; the validation goes stale.
6. **S4 — current_mileage unbounded:** No upper bound. User types `99999999999` → int32 overflow in Postgres, raw error.
7. **S5 — FK dropdown truncation:** Hardcoded `pageSize: 100` silently truncates if vehicle_types has >100 rows. User cannot see why their desired type is missing.
8. **S6 — auth expiry not mapped:** Long-running admin session hits session expiry → mutation fails → user sees default "Thao tác thất bại." with no indication to re-login.
9. **S7 — no list-query error state:** On Supabase outage or RLS denial, the page renders an empty table with no explanation. Looks like "no data" when it's actually a failure.
10. **S8 — dialog close during pending mutation:** Escape / backdrop click / Cancel all close the dialog immediately, orphaning the mutation. User sees stale UI; duplicate submits become possible.
11. **S9 — debounce duration unspecified:** Typo-magnet. 03-01 uses 300ms. Specify to prevent drift.

Deferred risks (documented, not applied):
- **Optimistic concurrency** — last-write-wins on concurrent edits. Requires `updated_at` match on UPDATE. Architectural, warrants dedicated plan.
- **Audit-trail columns** (created_by / updated_by) — requires Phase 2 schema change. Phase 2 is locked.
- **Status-transition FSM** — business rule; already in scope_limits.
- **Vietnamese license-plate regex** — business rule; uppercase+trim covers the critical data-integrity case.
- **Soft-delete** — architectural decision, out of scope.
- **ARIA/a11y** — already tracked as a global deferred item from 01-04.
- **E2E/unit tests** — no test harness established; cross-cutting, defer to a dedicated testing plan.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | license_plate not normalized — case-sensitive UNIQUE collision | Task 2a schema, Scope Limits, Verification, Checkpoint step 5 & 7 | Added `.transform(v => v.toUpperCase())` on license_plate; updated scope-limits note (regex deferred but normalization required); verification line added; checkpoint tests mixed-case collision |
| M2 | vin_number empty/whitespace → '' not null; UNIQUE conflict on second submit | Task 2a schema + serializeToInsert | Added trim + uppercase + explicit empty → null coercion in serializeToInsert; verification checks payload shows null; checkpoint step 5 tests whitespace input |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | Date fields accept arbitrary strings; PG 22007 not mapped | Task 2a schema + mapSupabaseError | Added `DATE_REGEX` with `.regex()` on both date fields; added 22007 → "Định dạng ngày tháng không hợp lệ" |
| S2 | No cross-field refine for next >= last maintenance date | Task 2a schema | Added `.superRefine()` comparing both dates (lexical compare is chronological on YYYY-MM-DD) |
| S3 | Year upper bound stale at module load | Task 2a schema | Moved year upper-bound check from static `.max()` to `.superRefine()` evaluated at submit time |
| S4 | current_mileage unbounded | Task 2a schema | Added `.max(10_000_000, 'Số km vượt quá giới hạn hợp lý')` |
| S5 | FK dropdown silent truncation at pageSize 100 | Task 2a schema + Task 2d | Added `FK_DROPDOWN_PAGE_SIZE = 1000`; inline truncation warning shown if `count > data.length` |
| S6 | No auth expiry handling in mapSupabaseError | Task 2a mapSupabaseError | Added status 401/403 + PGRST301 → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." |
| S7 | No list-query error state (blank table on failure) | New AC-9 + Task 2c | Added AC-9 for list error state; task action specifies inline error block + retry button when `isError` |
| S8 | Dialog closable during pending mutation | New AC-10 + Task 2d + Task 2e | Added AC-10 for dialog guard; both dialogs' `onOpenChange` must reject close while `isPending` |
| S9 | Debounce duration unspecified | Task 2c | Locked to 300ms with comment tying it to 03-01 |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | No optimistic concurrency (updated_at match on UPDATE) | Architectural change affecting every entity's update pattern; warrants a cross-cutting plan, not a feature-line fix. Low probability of concurrent admin edits in the MVP audience. |
| D2 | No audit-trail columns (created_by / updated_by) on vehicles | Requires Phase 2 schema amendment; Phase 2 is explicitly locked per boundaries. Track for a future schema-delta plan. |
| D3 | Status-transition FSM (UI-level) not enforced | Already noted in scope_limits. Business rule, not data-integrity; defer to a policy plan. |
| D4 | Vietnamese license-plate regex not enforced | Uppercase + trim covers the critical data-integrity case (duplicate detection). Regex is a UX strictness layer; business rule; defer. |
| D5 | No soft-delete | Consistent with 03-01 hard-delete pattern; soft-delete is architectural. Defer. |
| D6 | ARIA / keyboard accessibility in dialogs | Already tracked as deferred in STATE.md from 01-04; global concern, not plan-specific. |
| D7 | No E2E / unit tests for the feature | No test harness established for the project yet; defer to a dedicated testing-infrastructure plan. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence:**
- All mutations are Supabase-direct from an authenticated session; RLS + helper functions (from 02-06) record identity via `auth.uid()`; server-side access control is enforced at DB, not relying on client discipline. ✅
- DB-level constraints (UNIQUE, CHECK, FK RESTRICT) are the source of truth; the UI layer maps violations to Vietnamese messages. ✅
- BUT: vehicles table has no `created_by / updated_by` columns — *who* performed a mutation is not persisted in the row. Currently only discoverable via Postgres logs. **Compliance gap** — deferred (D2), must address in a future schema plan before any external audit.

**Silent failure prevention:**
- After this audit: list-query errors show retry UI (AC-9). ✅
- Uniqueness collisions produce typed messages (M1, M2). ✅
- Mid-flight cancellation via dialog close is prevented (AC-10). ✅
- FK dropdown truncation produces a visible warning instead of silent hiding (S5). ✅
- Session expiry produces a re-login prompt instead of generic "operation failed" (S6). ✅

**Post-incident reconstruction:**
- Client-side logs are browser-only — not durable.
- DB-level mutations ARE durable, but without created_by/updated_by, attribution requires Supabase Auth logs joined to timestamp ranges — possible but cumbersome. **Defer D2 closes this gap in a future plan.**

**Ownership and accountability:**
- Plan does not name a code owner. For an admin panel in a small team, the `git blame` + CODEOWNERS pattern is sufficient; no action required here.

**Real-audit failure points (as-is):**
- D2 (audit-trail columns) is the one line item that a rigorous SOC 2 / ISO auditor would flag. Document as known-and-tracked; schedule a schema-delta plan before GA.

## 6. Final Release Bar

**What must be true before this plan ships (all now satisfied after apply):**
- license_plate is normalized client-side before DB UNIQUE check meets it.
- vin_number serializes blank/whitespace to null — no UNIQUE-collision noise.
- Date fields validate format and cross-field order at the client.
- Year upper bound is current-year-dependent at submit time.
- current_mileage has a sane upper bound.
- Error paths (auth expiry, list failure, dialog close during pending) are all handled and user-visible.
- FK dropdown surfaces truncation.
- All error messages are Vietnamese and map from DB codes.

**Residual risks if shipped as-is (after apply):**
- **D2 (no audit-trail columns)** is the material residual risk for a regulated environment. Mitigating control: Supabase Auth logs + Postgres logs provide forensic attribution with effort. Acceptable for a pre-GA MVP.
- **D1 (no optimistic concurrency)** — low probability given MVP user count; acceptable.
- **D4 (no plate regex)** — accepts some data-quality looseness (non-Vietnamese plate formats would persist). Acceptable; a future UX-strictness pass can add the regex.

**Sign-off:** After applying the 2 must-have + 9 strongly-recommended upgrades, I would sign my name to this plan as the last review before production for a back-office admin panel. The deferred items are tracked and justified; none are release-blocking for MVP.

---

**Summary:** Applied 2 must-have + 9 strongly-recommended upgrades. Deferred 7 items (all documented with rationale).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
