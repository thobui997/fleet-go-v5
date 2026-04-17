# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-06-booking-form-page/10-06-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is structurally sound — it follows the established Phase 10 pattern correctly, has clear boundaries, and the create-only simplification is appropriate. Three strongly-recommended upgrades applied to strengthen FK dropdown UX, error handling completeness, and regression verification. No release-blocking gaps found.

The plan reuses existing form logic from the dialog rather than redesigning it, which is the correct approach for a layout migration.

## 2. What Is Solid

- **Create-only scope**: Correctly identifies that bookings don't have an edit mode — no fetch-by-ID hook, no edit route, no mapFetchError needed. Simplifies implementation correctly.
- **Pattern consistency**: Follows the exact same full-page layout as plans 10-02 through 10-05 (flex-col h-full, flex-none header/footer, overflow-y-auto content, FormSection).
- **useBlocker pattern**: Correctly specifies callback form with pathname guard and `!createMutation.isPending` condition — consistent with STATE.md decision.
- **Boundaries**: Entity layer, detail dialog, delete dialog, QR dialog, form schema all correctly marked as protected.
- **PassengerRow preservation**: Keeps the inner component unchanged — appropriate since it's used only in this form.
- **FK dropdown patterns**: __none__ sentinel, truncation warning, loading state all carried forward from existing dialog.
- **File deletion scope**: BookingCreateDialog is only imported in bookings-page.tsx — safe to delete.

## 3. Enterprise Gaps Identified

1. **onSubmit error handling underspecified** — Plan describes happy path (serialize → mutate → toast → navigate) but doesn't mention the catch block that calls mapBookingError. This is the error surface users see most — it needs explicit mention.

2. **FK dropdown empty state missing** — When customer or trip queries return 0 results, the form still allows submission. User fills passenger info, submits, gets "Vui lòng chọn khách hàng" validation error with no items to select. Confusing UX.

3. **No regression checkpoint** — Task 2 removes BookingCreateDialog from the list page but doesn't verify the list page still renders correctly (data table, filters, detail dialog). Prior Phase 10 audits all included regression checks.

4. **Auth-expiry for mutation not explicitly mentioned** — All prior Phase 10 plans explicitly mention auth-expiry handling. The existing mapBookingError covers it, but the plan should acknowledge this.

5. **getDefaultPrice hardcoded 150000** — Pre-existing bug from Phase 7. Uses hardcoded fallback instead of route.base_price. Fix requires trip entity TRIP_SELECT change to include `base_price` in route join, which violates plan boundaries.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

None. The plan is structurally complete.

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | onSubmit error handling underspecified | Task 1 action | Added explicit note: catch block must call mapBookingError, includes auth-expiry handling |
| 2 | FK dropdown empty state | Task 1 action + new AC-4b | Added AC-4b with Given/When/Then for empty dropdown state + submit disable. Added instructions in Task 1 action |
| 3 | Auth-expiry for mutation | Task 1 action | Added note that mapBookingError handles 401/403/PGRST301, no separate detection needed |
| 4 | Regression checkpoint missing | Task 2 verify | Added verification steps: list page renders, detail dialog works |
| 5 | Task 1 verify too thin | Task 1 verify | Replaced single "npm run build" with 4 specific checks (build + grep for key patterns) |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | getDefaultPrice hardcoded 150000 fallback | Pre-existing issue from Phase 7. Fix requires adding `base_price` to trip entity's TRIP_SELECT route join — violates plan boundaries (entity layer protected). Not a regression. Address in a future entity-layer cleanup plan. |
| 2 | Trip change should reset passenger seat numbers | UX improvement — when user switches trips, existing seat numbers from prior trip remain. Pre-existing behavior, not introduced by migration. |

## 5. Audit & Compliance Readiness

- **Error surface**: mapBookingError provides context-specific Vietnamese messages for all known error codes (23505 double-booking, 23503 FK violation, 23514 CHECK violation, 401/403/PGRST301 auth-expiry). Adequate for production.
- **Audit trail**: Booking creation already records booking_code (auto-generated), created_by (DB trigger). No new audit requirements introduced by layout migration.
- **Silent failure prevention**: useBlocker prevents accidental navigation loss. Toast notifications for success/error. Loading states on mutations. Adequate.
- **Post-incident reconstruction**: No new failure modes introduced — same API calls, same entity layer, just different UI layout.

## 6. Final Release Bar

**Must be true before shipping:**
- All 5 strongly-recommended upgrades applied (done)
- npm run build passes with zero errors
- Bookings list page still functions after dialog removal (regression)
- Booking detail dialog still opens from list page (regression)

**Remaining risks if shipped as-is:**
- Hardcoded 150000 default price for new passengers when trip has no price_override — low severity, users can manually change the price field
- Trip change doesn't reset passenger seat numbers — low severity, users are expected to verify seat numbers manually

**Verdict: Would sign off.** Plan follows established patterns, has appropriate safeguards, and the deferred items are pre-existing issues outside this plan's scope.

---

**Summary:** Applied 0 must-have + 5 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
