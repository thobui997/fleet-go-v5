# Enterprise Plan Audit Report

**Plan:** .paul/phases/05-employee-role-management/05-02-PLAN.md
**Audited:** 2026-04-15
**Verdict:** Conditionally acceptable (now ready — 3 must-have + 3 strongly-recommended applied)

---

## 1. Executive Verdict

**Conditionally acceptable — now ready after applied fixes.**

The plan is structurally sound: FSD entity slice pattern is correctly applied, profiles JOIN is properly modeled, and the license expiry badge logic is concrete and testable. However, three release-blocking defects were present: a broken error mapper that would silently fall through on 23505 constraint violations, a partial-save scenario in onSubmit that would leave UI in an inconsistent state, and a pre-fill race condition that could silently delete an employee's role assignment on fast submit. All three have been applied to the plan.

Would approve for production after fixes. Remaining deferred items are MVP-acceptable trade-offs.

---

## 2. What Is Solid

- **FSD entity slice structure**: `model/types → api/[name].api → api/[name].queries → index.ts` pattern is correctly followed with clean public API barrel.
- **profiles JOIN approach**: `profiles!inner` for search (forces INNER JOIN to filter by name) vs `profiles` (LEFT JOIN to show unlinked employees) is semantically correct and non-obvious — correctly specified.
- **assignEmployeeRole delete-then-insert**: Single-role-per-user enforcement via DELETE existing then conditional INSERT is correct for this MVP constraint. No surrogate key needed.
- **hasInitializedRef NOT used**: Explicitly called out as unnecessary here (role comes from a separate query, not from the prop). Avoids over-applying a pattern where it doesn't belong.
- **Dialog close guard during isPending**: Prevents double-submit via onOpenChange guard.
- **License expiry badge logic**: Uses `dayjs().startOf('day')` for correct boundary behavior (today = 0 days left = still "Sắp hết hạn", yesterday = -1 day = "Hết hạn"). Concrete and testable.
- **Boundaries**: profiles table correctly scoped READ ONLY. `src/entities/role/*` protected.

---

## 3. Enterprise Gaps Identified

### MH-1: mapEmployeeError SQLSTATE code fallbacks are broken

`msg.includes('23505')` and `msg.includes('23503')` check for PostgreSQL SQLSTATE codes in the human-readable `message` string. SQLSTATE codes live in the `.code` property of PostgrestError, not in `.message`. These fallback conditions can never match. The primary `msg.includes('employees_license_number_key')` check is reliable (constraint name IS in message), but the fallback `details.includes(column)` pattern is safer and matches the project's established convention (05-01 audit finding MH-1).

### MH-2: Role assignment partial-save not handled

`onSubmit` calls `mutateAsync` (employee save) then `assignEmployeeRole` (user_roles). If the employee saves successfully but `assignEmployeeRole` throws, the current description's single catch block "On error: mapEmployeeError, show error, keep dialog open" would keep the dialog open for an employee that's already been created/updated. The user would see an error and hit Cancel, not knowing the employee record exists. The list would not refresh. Data is consistent at the DB level but the UI hides the success, potentially causing a duplicate creation attempt.

### MH-3: useEmployeeRole pre-fill race condition

`useEmployeeRole(employee?.user_id ?? null)` returns `undefined` while loading. The `useEffect on [open, employee, currentRole]` fires immediately when the dialog opens. Without an `undefined` guard, the first fire resets `role_id` to `null` (currentRole is undefined, coerced to null), then fires again when data arrives with the real value. Between the two fires, if the user submits (fast submit on a slow connection), `assignEmployeeRole` is called with `roleId = null`, permanently deleting the employee's role assignment. This is silent data corruption.

### SR-1: Auth-expiry errors not mapped

PGRST301/401/403 auth-expiry errors fall through to "Đã xảy ra lỗi, vui lòng thử lại" — a confusing message for a session timeout. This has been flagged in every prior phase audit (03-02, 05-01).

### SR-2: fetchProfiles truncation not surfaced

`fetchProfiles()` limits to 1000 with no indication to the user that the list may be incomplete. If a company has >1000 staff (unlikely for MVP, but possible in production), the user dropdown silently omits results.

### SR-3: Checkpoint missing regression steps for router.tsx changes

The checkpoint verifies new functionality only. router.tsx is modified in this plan. Previously built routes (/roles, /vehicles) are not verified. A misconfigured import or route conflict would only surface if tested.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | mapEmployeeError fallback conditions `msg.includes('23505')` and `msg.includes('23503')` never fire — SQLSTATE in `.code`, not `.message` | Task 2 action — employee-form-schema.ts | Extracted `code` + `details` from error object; changed to `code === '23505'` + `details.includes('(column)')` pattern; changed to `code === '23503'` for FK violation |
| 2 | onSubmit partial-save: employee saved, role assignment fails, dialog stays open hiding the created employee | Task 2 action — employee-form-dialog.tsx onSubmit | Split try/catch — employee mutation failure keeps dialog open; role assignment failure closes dialog + refreshes list + shows specific partial-save toast |
| 3 | useEmployeeRole pre-fill race: useEffect fires with `currentRole === undefined`, resets role_id to null, fast-submit silently deletes existing role | Task 2 action — employee-form-dialog.tsx useEffect | Added `currentRole !== undefined` guard before reset; documented the undefined/null/string states |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Auth-expiry (PGRST301/401/403) not mapped in mapEmployeeError | Task 2 action — employee-form-schema.ts | Added `msg.includes('PGRST301') \|\| msg.includes('401') \|\| msg.includes('403')` → Vietnamese session-expired message |
| 2 | fetchProfiles truncation — no warning when list hits 1000 cap | Task 2 action — employee-form-dialog.tsx | Added `profiles.length >= 1000` warning paragraph below user_id Select |
| 3 | Checkpoint missing router.tsx regression verification | Task 3 checkpoint how-to-verify | Added steps 14 (/roles page) and 15 (/vehicles page) to catch route import conflicts |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | profiles dropdown doesn't filter already-linked profiles | Requires LEFT JOIN anti-join; mapEmployeeError handles 23505 employees_user_id_key with clear message. MVP acceptable. |
| 2 | Role dropdown doesn't refresh when user_id changes in edit mode | Changing user_id on an existing employee is an unusual operation; MVP edge case. |
| 3 | URL-synced filters (search, isActive, page) | Consistent deferral across all phases (04-01, 04-02, 03-02). |
| 4 | Optimistic concurrency | Consistent deferral across all phases. Phase 7+ concern. |
| 5 | assignEmployeeRole atomicity | MVP acceptable; delete+insert is a common pattern for single-role-per-user; full atomicity would require a DB function or Edge Function. |

---

## 5. Audit & Compliance Readiness

**Error traceability:** After fixes, all known constraint violations map to Vietnamese user messages. No raw PostgreSQL error strings reach the UI. SQLSTATE codes are read from `.code` (not parsed from message), matching the authoritative error structure.

**Partial-save visibility:** After MH-2 fix, a partial save (employee created, role assignment failed) surfaces to the user explicitly with a distinct toast. The list refreshes so the employee record is visible. Post-incident reconstruction is possible: the employee exists in DB, no user_roles entry.

**Data corruption prevention:** After MH-3 fix, the role pre-fill race condition is eliminated. Existing role assignments cannot be silently deleted via a fast-submit race.

**Audit trail weaknesses:** No `created_by`/`updated_by` on employees table (flagged in 03-02, deferred to future schema delta). This remains a compliance gap for regulated environments.

**Ownership:** No authorization boundaries enforced in this plan's UI code — RLS policies (Phase 2) are the enforcement layer. For MVP this is acceptable, but permission-gated UI elements are deferred.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `mapEmployeeError` uses `.code` field for SQLSTATE checks (MH-1 applied)
- Partial-save scenario shows partial-success toast, not silent dialog-open (MH-2 applied)
- `useEffect` edit-mode reset guards against `currentRole === undefined` (MH-3 applied)

**Risks if shipped as-is (before fixes):**
- 23505 constraint violations on license_number/user_id could fall through to generic error if constraint name doesn't appear in message (implementation-dependent)
- Fast-submit on edit dialog over slow connection could silently remove employee's role assignment
- Employee creation success could be hidden from user if role assignment fails

**After applied fixes — remaining risk:**
- `assignEmployeeRole` is non-atomic (delete + insert); a network failure between the two calls leaves no role assigned. Acceptable for MVP.
- profiles dropdown may silently cap at 1000 (truncation warning added, but no search/filter on dropdown itself)

**Sign-off:** Yes — with applied fixes, this plan is production-acceptable for an MVP. The three must-have defects were subtle (error object structure, async sequencing, React state timing) and would likely have been found in testing, but the fixes eliminate the risk entirely.

---

**Summary:** Applied 3 must-have + 3 strongly-recommended upgrades. Deferred 5 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
