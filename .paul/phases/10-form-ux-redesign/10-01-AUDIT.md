# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-form-ux-redesign/10-01-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally Acceptable

---

## 1. Executive Verdict

**Conditionally acceptable — now ready after applied fixes.**

This is a UI-only structural refactor with no data mutation, no API calls, and no auth boundary changes. The architectural approach is sound: a shared `FormSection` component, a well-understood CSS focus-ring fix, and grid layout optimizations that don't alter form submission logic. I would approve this plan for production after the applied fixes.

One TypeScript compilation blocker (missing React import) and four specification gaps that would cause silent failures or duplicate rendering during execution.

---

## 2. What Is Solid

- **Scope containment**: Boundaries section explicitly protects the 4 dialogs moving to pages in plans 10-02 through 10-05. No risk of cross-plan contamination.
- **Focus fix approach**: `p-[3px] -m-[3px]` is the correct pattern. In Tailwind v3, `padding-right` utilities appear after `padding` shorthand in the generated CSS cascade, so `pr-1` correctly overrides the right side of `p-[3px]`. No layout shift.
- **FSD compliance**: `FormSection` placed in `@shared/ui`, exported via public API in `index.ts`. Correct layer.
- **Non-destructive task boundary**: "IMPORTANT — do not change" list in Task 2 is explicit: schemas, mutations, error handling, guard logic. Correct — none of these should be touched.
- **Checkpoint placement**: Human-verify after both auto tasks is appropriate. Correct sequencing.
- **`autonomous: false`**: Correctly set given the human-verify checkpoint.

---

## 3. Enterprise Gaps Identified

**Gap 1 — TypeScript compilation failure in FormSection snippet**
Task 1 action shows `React.ReactNode` in the interface without `import * as React from 'react'`. This project uses the `import * as React` pattern (confirmed in all existing dialog files). Without the import, TypeScript will fail with "Cannot find namespace 'React'". This is a release blocker — the build fails.

**Gap 2 — Double section header in Vehicle Types dialog**
`vehicle-type-form-dialog.tsx` lines 207–211 already contain a hand-rolled section header using `<p className="text-sm font-medium">Cấu hình chỗ ngồi</p>`. Task 2 says "Wrap fields into FormSection groups" without instructing the executor to remove this existing header first. The APPLY executor will wrap the existing header inside the FormSection, resulting in "Sơ đồ chỗ ngồi" (FormSection title) above "Cấu hình chỗ ngồi" (existing p tag) — a visible duplicate.

**Gap 3 — Hedge language creates ambiguous execution path**
`"Mô tả (full width, if textarea exists)"` in the Vehicle Types section implies the field may or may not be present. It IS present (confirmed from file read at line 198–203). This hedge will cause the executor to hesitate or conditionally skip the field. In an automated execution context, ambiguity produces inconsistency.

**Gap 4 — Dialog width changes not included in Task 2 verify**
Task 2 verify checks FormSection usage and focus fix but does not verify that `sm:max-w-[680px]` was set for Vehicles and `sm:max-w-[640px]` for Customers. If these changes are missed, 2-col grids will be cramped inside the narrower `sm:max-w-[560px]` container.

**Gap 5 — Human verify doesn't test form submit flow**
The checkpoint verifies visual rendering but not functional correctness. The Customers dialog moves the Gender field (a `Controller`-controlled `Select`) into a 2-col grid. If the `Controller` loses its `form` context during restructuring (e.g., placed outside the `<form>` element accidentally), it submits with `undefined` instead of the selected value — silently incorrect. The Stations `is_active` Switch is also `Controller`-managed. Submit tests catch this class of regression.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Missing `import * as React from 'react'` in FormSection component snippet — `React.ReactNode` unresolved, TypeScript build failure | Task 1 `<action>` code snippet | Added `import * as React from 'react';` as first line of FormSection component |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 2 | Vehicle Types dialog has existing manual "Cấu hình chỗ ngồi" section header that will duplicate when FormSection is added | Task 2 `<action>` — Vehicle Types section | Added explicit instruction to remove existing `<div className="space-y-3"><p className="text-sm font-medium">Cấu hình chỗ ngồi</p>` wrapper before wrapping with FormSection |
| 3 | Hedge language "if textarea exists" on description field in Vehicle Types section | Task 2 `<action>` — Vehicle Types section | Changed to "Mô tả Textarea (full width — confirmed present in file)" |
| 4 | Dialog width changes (max-w-[680px], max-w-[640px]) not verified in Task 2 | Task 2 `<verify>` | Added grep verification for Vehicles `sm:max-w-[680px]` and Customers `sm:max-w-[640px]` |
| 5 | Human verify checkpoint doesn't test form submission — Controller fields (Gender, is_active) can silently break when moved to 2-col grids | Task 3 `<how-to-verify>` | Added submit test steps 7–8: create a Vehicle and a Customer, confirm save + toast |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | `className` prop on FormSection for per-usage customization | Not needed by any current consumer; add when a concrete need arises |
| 2 | ARIA `role="separator"` on FormSection's `<hr>` | Pre-public accessibility debt already tracked in STATE.md deferred issues; consistent with project policy |
| 3 | `description`/subtitle prop on FormSection | No current form needs a subtitle; speculative feature |

---

## 5. Audit & Compliance Readiness

**Evidence produced:** Human-verify checkpoint with explicit browser test steps (visual + functional). Build gate on TypeScript compilation. Sufficient for internal audit trail.

**Silent failure prevention:** The added submit tests (finding #5) close the most likely silent failure mode — Controller fields that visually render correctly but submit `undefined` due to context loss after restructuring.

**Post-incident reconstruction:** The task structure with file-level granularity and explicit verify steps is sufficient for post-incident analysis. If a regression is found after deployment, the boundary section clearly defines what was and wasn't changed.

**Ownership and accountability:** The plan's boundaries section explicitly names the 4 out-of-scope dialogs. No ambiguity about what was changed.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
- `import * as React from 'react'` present in FormSection (applied — must-have #1)
- Existing Vehicle Types manual section header removed (applied — SR #2)
- `npm run build` exits with code 0
- Human-verify checkpoint approved, including submit tests for Vehicles and Customers

**Remaining risks if shipped as-is (before fixes):**
- TypeScript build failure due to missing React import — cannot ship
- Visible double header in Vehicle Types dialog — immediate UX regression
- Possible silent form submission breakage on Gender/is_active fields

**Sign-off statement:** With the 5 applied fixes, I would sign off on this plan. It is a well-contained UI refactor with clear boundaries, explicit verification, and no mutations to data or auth.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
