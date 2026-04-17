# Enterprise Plan Audit Report

**Plan:** .paul/phases/13-toast-message-standardization/13-01-PLAN.md
**Audited:** 2026-04-18
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The scope is well-contained (toast() parameter edits only, no logic changes) and the target standard is unambiguous. One must-have gap was identified: Tasks 2 and 3 used conditional "check if has title; if missing → add it" language for error toasts, which is implementation-ambiguous — an implementer may silently preserve a non-conforming existing title (e.g., `'Lỗi rồi'`) if one already exists. This was resolved by replacing all conditional instructions with unconditional enforcement. Four strongly-recommended improvements were applied. Plan is now ready for APPLY.

---

## 2. What Is Solid

- **Standard pattern clearly defined in context:** Three variants (success/error/warning) with exact field values — eliminates implementer guesswork.
- **Already-standardized exclusion list:** Explicitly names files that must not be touched (trip-delete-dialog, staff-assignment-dialog), preventing over-engineering.
- **Boundaries section protects non-toast code:** Error mappers, dialog logic, mutation calls are explicitly out of scope — prevents scope creep during APPLY.
- **Human-verify checkpoint after all 3 auto tasks:** Correct sequencing; build verification occurs before approval gate.
- **Warning variant (Cảnh báo) correctly defined:** The employee partial-save case is called out explicitly with correct title/description split rather than leaving it as implicit.

---

## 3. Enterprise Gaps Identified

**Gap 1 (Must-Have): Conditional error title enforcement creates silent compliance risk**
Tasks 2 and 3 used "check if has title; if missing → add `title: 'Lỗi'`". If a file already has a non-standard title (e.g., a past commit set `title: 'Có lỗi xảy ra'`), the implementer may leave it intact thinking the condition "already has title" is satisfied. The standard requires exactly `'Lỗi'` — any other value is non-conforming. Risk: silent non-compliance on error paths, inconsistent UX under failure.

**Gap 2 (Strongly Recommended): Task 1 verify only checked `variant:` field, not `title:`**
The per-task verify for Task 1 said "every call has `variant:` field" — but didn't verify the `title:` field. Since Task 1 is specifically fixing files that had `title` but no `variant` (or vice versa), not checking both fields means a half-fixed toast (e.g., variant added but title still wrong) could pass the per-task verify step.

**Gap 3 (Strongly Recommended): route-stops-dialog.tsx error path was underspecified**
The plan's instruction was "Check if any error toast; fix if missing title/variant" — but this dialog uses an `onError` callback pattern (not try/catch), and the current state of its error handler was not described. Without a known baseline, an implementer may not know what to look for or what the target should be.

**Gap 4 (Strongly Recommended): Human-verify checkpoint lacked a concrete grep command**
The checkpoint instructed manual visual verification but did not include a grep command to systematically confirm zero non-conforming toast calls across all 17 files. Visual inspection of 17 files is error-prone; a grep provides objective evidence.

**Gap 5 (Can safely defer): No automated test coverage for toast behavior**
Toast messages are not covered by any unit or integration tests. This means regressions (e.g., a future refactor changing `'Thành công'` to `'OK'`) would go undetected. However, this project has no established test harness, and adding it is out of scope for a standardization phase. Deferred.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Conditional "check if" error title instruction creates silent non-compliance risk | Tasks 2 and 3 `<action>` sections | Replaced all "check if has title; if missing → add" with "ALWAYS set `title: 'Lỗi'` — unconditional, do not skip if title already exists with different text" |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 2 | Task 1 verify missing `title:` field check | Task 1 `<verify>` | Changed "every call has `variant:` field" → "every call has both `variant:` field AND `title:` field" |
| 3 | route-stops-dialog.tsx error path underspecified | Task 2 `<action>` | Added explicit target for onError callback: `{ title: 'Lỗi', description: mapXxxError(err) or err.message, variant: 'destructive' }` with instruction to add if missing |
| 4 | Human-verify checkpoint lacked concrete grep | Checkpoint `<how-to-verify>` | Added explicit grep command listing all 17 files for systematic compliance check |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| 5 | No automated test coverage for toast messages | No test harness exists in this project. Adding tests is out of scope for a UI standardization phase. Manual verification via checkpoint is sufficient for current maturity level. |

---

## 5. Audit & Compliance Readiness

**Evidence produced:** Human-verify checkpoint now includes a grep command that serves as objective audit evidence — an auditor can run it post-apply to confirm zero non-conforming calls.

**Silent failure prevention:** Must-have fix removes the conditional ambiguity that could leave non-standard error titles silently in place. All 17 files now have unconditional enforcement instructions.

**Post-incident reconstruction:** Toast messages are UX-layer feedback, not audit trail data (no server-side logging). No post-incident reconstruction concern applies to this layer.

**Ownership and accountability:** The APPLY executor is fully accountable for all 17 files via the per-task verify steps and the human-verify checkpoint.

---

## 6. Final Release Bar

**Must be true before shipping:**
- `npm run build` passes with zero errors
- Per-task grep confirms both `title:` and `variant:` present in every toast call in all 17 files
- Human-verify checkpoint approved after live testing of create/delete/error flows

**Remaining risks if shipped as-is (after fixes):**
- No automated regression protection — a future PR could re-introduce an inconsistent toast without CI catching it. Acceptable at current project maturity.
- `route-stops-dialog.tsx` onError path may be absent entirely (the dialog might swallow errors). If so, an error toast should be added — the implementer must verify and add if missing.

**Sign-off:** I would approve this plan for production execution with the applied fixes. The change is low-risk (parameter-only edits), the scope is bounded, and the verification is now objective.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 1 item.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
