# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-form-ux-redesign/10-04-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

This plan is **conditionally acceptable** for execution. It follows the established MaintenanceFormPage pattern from 10-02, which has been validated in production. The two-step save logic is correctly preserved from the existing employee form dialog. After applying the strongly-recommended upgrades below, the plan is ready for APPLY.

**Would I approve this for production?** Yes, after the applied upgrades. The pattern is proven, the risks are understood, and the edge cases are now addressed.

---

## 2. What Is Solid

- **Pattern consistency:** Correctly follows the MaintenanceFormPage structure (10-02) which has been audited and executed successfully
- **Two-step save preservation:** The plan correctly captures the non-atomic save pattern (employee record → role assignment) with partial failure handling
- **hasInitializedRef pattern:** Explicitly specified for edit-mode form pre-fill, preventing TanStack Query background refetch race conditions
- **useBlocker with pathname guard:** Correctly prevents dirty-state dialog from triggering on same-pathname navigation
- **reset() before navigate():** Explicitly specified to clear isDirty before post-submit redirect
- **Auth-expiry awareness:** The plan explicitly mentions PGRST116/401/403/PGRST301 handling for fetch errors

---

## 3. Enterprise Gaps Identified

### Gap 1: mapFetchError not specified in source file
The plan references `mapFetchError` function for edit-mode fetch errors, but `src/pages/employees/model/employee-form-schema.ts` only contains `mapEmployeeError`. The plan was underspecified about WHERE this function should be added.

### Gap 2: Submit error rendering placement unclear
The plan says "Submit error displayed above footer" but didn't specify the exact JSX placement. This ambiguity could lead to implementation errors where the error appears outside the scrollable area.

### Gap 3: FK dropdown empty states not specified
The plan mentions profiles and roles dropdowns but doesn't specify what happens when these lists are empty during create mode. Should submission be allowed without a user or role?

### Gap 4: Missing regression checkpoint for router changes
The plan modifies `router.tsx` which is a critical cross-cutting file. The verification checkpoint didn't include a regression test to ensure other routes (maintenance, trips) still work after the changes.

### Gap 5: Auth-expiry handling for two-step save
While the plan mentions auth-expiry for fetch errors, the two-step save's role assignment step could also fail with auth-expiry (401/403) after the employee is already saved. This edge case wasn't explicitly handled.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

None. The plan's fundamentals are sound.

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | mapFetchError function location | Task 1: Error handling section | Added specification: "add to employee-form-schema.ts or inline in page" with PGRST116→"Không tìm thấy hồ sơ nhân viên." mapping |
| 2 | Submit error rendering placement | Task 1: Error handling section | Added exact JSX placement: "render `{submitError && <p className="text-sm text-destructive">{submitError}</p>}` before the closing `</div>` of scrollable content, before footer" |
| 3 | FK dropdown empty states | Task 1: Form fields section | Added empty state handling for both profiles and roles dropdowns with "Chưa có..." message and submit disable |
| 4 | Router regression checkpoint | Task 2: verify section | Added regression check: "Verify other routes (maintenance, trips) still work — navigate to `/maintenance/new` and `/trips/new`" |
| 5 | Auth-expiry for two-step save | Task 1: Error handling section | Added: "Auth-expiry handling for two-step save: role assignment can fail with 401/403/PGRST301 — catch and handle gracefully (warn user, employee already saved)" |
| 6 | Router regression in checkpoint | Task 3: how-to-verify section | Added regression test step: "Navigate to `/maintenance/new` and `/trips/new` to confirm router.tsx changes didn't break existing form routes" |

### Deferred (Can Safely Defer)

None deferred. All findings addressed.

---

## 5. Audit & Compliance Readiness

**Audit Evidence:** The plan produces clear artifacts (EmployeeFormPage component, route updates) that are auditable and traceable to acceptance criteria.

**Failure Prevention:**
- Two-step save explicitly handles partial failures with user warning
- Edit-mode fetch error states prevent silent failures
- Dirty-state guard prevents accidental data loss

**Post-Incident Reconstruction:**
- Form submit logic is explicit about save order (employee → role)
- Error handling paths are specified with Vietnamese messages

**Ownership & Accountability:**
- Clear file-by-file modification list
- Verification steps include regression testing
- Boundaries protect stable subsystems (entities, roles, delete dialog)

---

## 6. Final Release Bar

**Before this plan ships:**
1. Build must pass with zero errors
2. All acceptance criteria verified via human-verify checkpoint
3. Router regression confirmed (maintenance/trips form routes still work)

**Remaining risks if shipped as-is (after upgrades):**
- None significant. The pattern is proven from 10-02 and 10-03.

**Would I sign my name to this system?** Yes. After the applied upgrades, this plan follows a validated pattern with appropriate error handling and edge case coverage.

---

**Summary:** Applied 0 must-have + 6 strongly-recommended upgrades. Deferred 0 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
