# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-form-ux-redesign/10-02-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready after fixes applied)

---

## 1. Executive Verdict

Conditionally acceptable. The plan is structurally sound for a UX migration task. Reuse of the existing entity hook (`useMaintenanceLog`), schema, serializer, and error mapper eliminates duplication risk. The `hasInitializedRef` pattern is correctly called out. However, one release-blocking correctness bug was found (`useBlocker` intercepts post-submit navigation), plus three recommended hardening items. All have been applied to the plan.

Would I approve this for production with findings applied? Yes.

---

## 2. What Is Solid

- **Entity layer reuse** — `useMaintenanceLog(id)`, `useCreateMaintenanceLog`, `useUpdateMaintenanceLog` all exist and are imported, not reimplemented. No risk of divergence.
- **Schema/serializer reuse** — `maintenanceFormSchema`, `serializeToInsert`, `mapSupabaseError` imported from model layer. No duplicate logic.
- **`hasInitializedRef` pattern explicitly specified** — prevents background refetch race condition in edit mode from overwriting unsaved changes. Correct and consistent with Phase 4 established pattern.
- **`useBlocker` from react-router-dom** — correct API choice; no new dependency required.
- **Boundaries correctly protect** entity layer, delete dialog, and badge component from scope creep.
- **Dialog deletion included** — plan correctly removes the orphaned dialog file rather than leaving dead code.

---

## 3. Enterprise Gaps Identified

### Critical Correctness Bug
**`useBlocker` blocks post-submit navigation:** After `mutateAsync` resolves successfully, `isPending = false` and `isDirty = true` (form state not cleared). The blocker condition `isDirty && !isPending` evaluates to `true`. When `navigate(ROUTES.MAINTENANCE)` is called, the blocker intercepts it, showing the "Thoát?" dialog to the user who just successfully saved their data. This is a UX-breaking correctness bug that would be reported immediately by any tester.

### UX/Support Risk
**Generic fetch error message hides auth-expiry:** The `isError` state showed a single hardcoded "Không tìm thấy bản ghi" regardless of the actual error. A user whose session expired while on the edit page would see "record not found" rather than "session expired" — causing confusion and unnecessary support escalation.

### Subtle API Risk
**`useBlocker` boolean form blocks same-page navigations:** The boolean form `useBlocker(isDirty && !isPending)` intercepts all navigation attempts including same-pathname navigations (hash changes, search param updates). The callback form with `currentLocation.pathname !== nextLocation.pathname` is more precise.

### Future Maintenance Risk
**Route insertion order not documented:** `/maintenance/new` must be registered before `/maintenance/:id/edit`. React Router v6 handles this correctly via segment ranking, but without a comment, a future developer inserting routes between them could create a subtle ordering bug.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `useBlocker` intercepts post-submit `navigate()` — `isDirty` not cleared after mutateAsync success | Task 1 `<action>` submit logic | Added: call `reset()` before `navigate(ROUTES.MAINTENANCE)` after successful mutateAsync; added comment explaining why (clears isDirty to prevent blocker); AC-7 updated with "blocker does NOT intercept post-submit navigation" |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 2 | Generic `isError` message hides auth-expiry vs not-found distinction | Task 1 `<action>` structure + error state | Added `mapFetchError(error)` inline helper distinguishing PGRST116 (not found), 401/403/PGRST301 (auth-expiry), and generic. Updated AC-6 to include auth-expiry scenario. |
| 3 | Boolean `useBlocker` form intercepts same-page navigations | Task 1 `<action>` useBlocker | Changed to callback form: `({ currentLocation, nextLocation }) => isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname` |
| 4 | Route ordering not documented | Task 2 `<action>` router.tsx | Added explicit comment: register MAINTENANCE_NEW before MAINTENANCE_EDIT, with reasoning |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 5 | ARIA attributes on dirty-state confirmation dialog (`role="alertdialog"`, `aria-labelledby`) | Consistent with project-wide ARIA deferral decision from Phase 1. Will be addressed in a future a11y pass before GA. |
| 6 | Page transition animation when navigating to/from form page | Pure aesthetic enhancement; no functional or data-integrity impact. |

---

## 5. Audit & Compliance Readiness

**Evidence production:** The plan produces a full-page audit trail via the form page being a distinct URL — browser history captures the create/edit action. Adequate for operational review.

**Silent failure prevention:** Error states are specified for both entity fetch (isError) and form submit (catch block with toast). No silent failures.

**Post-incident reconstruction:** Navigation to `/maintenance/:id/edit` is a bookmarkable URL — support staff can reproduce user issues by navigating directly. Stronger than the previous dialog-based flow.

**Ownership:** `serializeToInsert` is the single source of truth for data transformation; `mapSupabaseError` for server error messages. Both pre-existing and validated.

**Residual risk:** Auth-expiry handling on the list page (not this plan's scope) was already audited in Phase 3 (03-03). This plan's auth-expiry coverage on the form page fetch path is now explicitly specified.

---

## 6. Final Release Bar

**Must be true before shipping:**
- `reset()` called before `navigate()` on successful submit (applied to plan)
- `useBlocker` uses callback form with pathname guard (applied to plan)
- `mapFetchError` used for entity fetch error state (applied to plan)
- Build passes zero TypeScript errors

**Remaining risks if shipped with applied fixes:**
- ARIA on dirty-state dialog — deferred, low operational risk
- Route ordering relies on React Router v6 segment ranking — documented in plan, acceptable

**Sign-off statement:** With findings applied, this plan is enterprise-acceptable for a fleet management back-office system. The correctness bug (blocker on post-submit navigation) is addressed; error messaging is now unambiguous; route safety is documented.

---

**Summary:** Applied 1 must-have + 3 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
