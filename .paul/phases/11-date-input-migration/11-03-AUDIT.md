# Enterprise Plan Audit Report

**Plan:** .paul/phases/11-date-input-migration/11-03-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — ready after applied upgrades.**

This is a low-risk UI refactoring plan: no auth changes, no server mutations, no external APIs. The migration is mechanical and well-scoped. The one genuine release-blocking risk was the underspecified `toLocalISODate` implementation — without explicit zero-padding and month-offset, the apply phase could silently produce malformed date strings ("2026-4-5" instead of "2026-04-17") that break API queries without a TypeScript error. That gap has been remediated. I would approve this plan for production.

---

## 2. What Is Solid

- **Task ordering is correct:** extract utility first, then migrate pages — Tasks 1 and 2 have a genuine dependency (Task 2 needs `toLocalISODate` from Task 1's output)
- **Frontmatter is accurate:** `depends_on: ["11-02"]` correctly reflects the stable DatePicker/DateTimePicker base; `autonomous: false` is correct since a human-verify checkpoint blocks
- **Boundaries section is explicit and protective:** `DateRangePicker.tsx` and API hooks are locked, preventing scope drift into the stable layer
- **`setPage(1)` on range change is specified:** avoids stale pagination — this is easy to forget and was correctly included
- **Verification uses machine-checkable grep commands:** `grep -r "type=\"date\""` is unambiguous evidence, not a subjective check
- **`DateRange` type import specified:** `import type { DateRange }` correctly uses TypeScript type-only import

---

## 3. Enterprise Gaps Identified

**Gap A (Must-Have): `toLocalISODate` implementation underspecified — zero-padding and month offset omitted**

Task 1 said "using getFullYear/getMonth/getDate" without specifying:
1. `Date.getMonth()` returns 0-11 — `getMonth() + 1` is required
2. Month and day must be zero-padded with `padStart(2, '0')` to produce "2026-04-05" not "2026-4-5"

If the apply phase produces an unpadded implementation, Supabase PostgREST date comparisons silently fail or return wrong results (string comparison of "2026-4-5" vs "2026-04-05" is unpredictable). No TypeScript error is raised — it's a silent data correctness bug.

**Gap B (Strongly Recommended): `fromLocalISODate` implementation also underspecified**

Task 1 said "parses via `new Date(y, m-1, d)`" without specifying the string parsing step. An apply-phase implementation could use `new Date(str)` which parses as UTC midnight — exactly the UTC shift bug this function was designed to prevent. Explicit: `const [y, m, d] = str.split('-').map(Number)`.

**Gap C (Strongly Recommended): Human-verify missing pagination reset check**

`setPage(1)` on date change is specified in Task 2 but not exercised in the verify checkpoint. If `setPage(1)` is accidentally dropped in the migration, the bug is invisible without a specific verification step.

**Gap D (Strongly Recommended): Human-verify missing clear-both-dates check**

The verify steps included "clear one date" but not clearing both dates to confirm the unfiltered state is restored. For list page filters, the clear path is as important as the filter path.

**Gap E (Strongly Recommended): No AC for empty-range pass-through behavior**

AC-2/3/4 only test the filter-active path. The behavioral contract that empty `DateRange` → `dateFrom/dateTo` both `undefined` → all records shown was unverified. This is a distinct code path (`dateRange.from ? ... : undefined`).

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `toLocalISODate` underspecified — no zero-padding, no month+1 offset | Task 1 `<action>` | Added exact implementation with `getMonth() + 1`, `padStart(2, '0')` for both month and day; added `fromLocalISODate` exact implementation with `split('-').map(Number)` |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `fromLocalISODate` implementation underspecified | Task 1 `<action>` | Added exact implementation (included with must-have fix above) |
| 2 | Human-verify missing pagination reset check | Task 3 `<how-to-verify>` | Added "if on page 2+, confirm page resets to 1 when a date is selected" |
| 3 | Human-verify missing clear-both-dates check | Task 3 `<how-to-verify>` | Added "clear both dates → table shows all records" for all 3 pages |
| 4 | No AC for empty-range pass-through | `<acceptance_criteria>` | Added AC-7: empty DateRange → dateFrom/dateTo undefined → all records shown |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Re-export `DateRangePicker` + `DateRange` from `@shared/ui/index.ts` | Cosmetic consistency — form components are intentionally in `@shared/ui/form` sub-namespace; inconsistency is pre-existing and harmless |
| 2 | `dateTo` end-of-day semantics — "2026-04-17" string filter on datetime column may exclude records after midnight | Pre-existing behavior unchanged by this migration; affects native inputs equally; PostgREST behavior is consistent |
| 3 | ARIA labels on DateRangePicker trigger buttons | Pre-existing gap from 11-01; outside this plan's scope |

---

## 5. Audit & Compliance Readiness

**Evidence quality:** The verification checklist uses machine-checkable grep commands — this is strong evidence. `grep -r "type=\"date\""` produces zero-or-nonzero output that maps directly to AC-1.

**Silent failure prevention:** The must-have fix (explicit `toLocalISODate` implementation) prevents the most dangerous failure mode — malformed date strings that produce wrong filter results without raising any error.

**Post-incident reconstruction:** This plan makes no data changes, no writes, no state mutations outside UI state. There is nothing to reconstruct post-incident beyond "filters showed wrong date range."

**Ownership:** The human-verify checkpoint ensures a human confirms the filter behavior before the loop closes. This is appropriate for a UI feature.

**Build verification:** `npm run build` appears in both Task 1 verify and Task 2 verify, and is added to the human-verify checkpoint. Three independent build checks prevent late TypeScript errors.

---

## 6. Final Release Bar

**Must be true before this plan ships:**
- `toLocalISODate` produces correctly zero-padded YYYY-MM-DD strings (verified by the explicit implementation in Task 1)
- Zero `type="date"` inputs in `src/` (verified by grep in Task 2 verify)
- Build passes with zero errors (verified in Tasks 1, 2, and human-verify)
- All 3 pages visually confirmed with filter-active and filter-cleared paths

**Remaining risks if shipped as-is (after applied fixes):**
- Minor: `dateTo` end-of-day semantics may exclude late-day records (pre-existing, deferred)
- Minor: ARIA accessibility gap on DateRangePicker trigger buttons (pre-existing, deferred)

**Sign-off:** I would sign my name to this plan as written after the applied upgrades. The scope is tightly bounded, the correctness risk has been addressed, and the human-verify checkpoint provides a real quality gate.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
