# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-customer-ticketing-payment/07-04-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan follows established project patterns correctly and is well-scoped for a CRUD list page. One must-have finding (processed_by audit trail) and five strongly-recommended findings have been applied. After these changes, the plan is ready for execution.

Would I approve for production? Yes, with the applied changes. The remaining deferred items (permission-gated UI, optimistic concurrency) are consistent with project-wide deferrals and do not block this plan specifically.

## 2. What Is Solid

- **Entity slice pattern** — Follows the exact same file structure, export pattern, and query key convention as the booking entity. No architectural innovation here, which is good.
- **Boundaries section** — Correctly protects stable entities (booking.api.ts, ticket, vehicle-type, migrations) and sets clear scope limits (no payment creation, no provider integration, no analytics).
- **maybeSingle for fetchPaymentByBooking** — Correctly handles the case where a booking may not have an associated payment. Using `.single()` would crash on null.
- **Error state with retry (AC-6)** — Consistent with all prior page patterns. Error display with AlertCircle + Vietnamese message + retry button.
- **No create button** — Correctly scoped out. Payments are created implicitly or externally; this plan only manages existing payment status.

## 3. Enterprise Gaps Identified

1. **processed_by audit trail gap (MUST-HAVE)** — The `processed_by` column in the DB schema exists specifically for "audit trail for cash handling." The plan's `updatePaymentStatus` sets paid_at and refunded_at but completely omitted processed_by. Without this, there is no record of WHO confirmed a cash payment — an accountability gap that would fail any financial audit.

2. **Date filter excludes pending payments (STRONGLY RECOMMENDED)** — Filtering on paid_at means payments with status='pending' (paid_at IS NULL) are silently excluded from date-filtered results. A user filtering "today's payments" would not see pending payments created today. created_at is the correct field.

3. **No status transition validation (STRONGLY RECOMMENDED)** — The API function allows arbitrary status transitions. While the UI restricts buttons by status, the API layer should validate: only pending→(completed|failed) and completed→refunded are legal. Without this, direct API calls (or future UI bugs) could produce invalid states like failed→pending or refunded→completed.

4. **Search trim not specified (STRONGLY RECOMMENDED)** — Every prior audit (07-01 through 07-03) flagged search trim before ilike. This plan's fetchPayments didn't specify trimming the search parameter, allowing whitespace-padded search terms to fail silently.

5. **23505 discrimination uses wrong field (STRONGLY RECOMMENDED)** — The 07-02 audit established that PostgreSQL constraint names are in the `message` field, not `details`. The plan didn't specify which field to check for constraint name discrimination.

6. **Missing regression checkpoint (STRONGLY RECOMMENDED)** — Modifying booking-detail-dialog.tsx and router.tsx risks regressions in booking and check-in pages. No regression verification steps were included.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | processed_by omitted from status update — audit trail gap for cash handling | Task 1 action (payment.api.ts), AC-2, AC-3, Task 2 action (payment-status-dialog.tsx) | Added processed_by to UpdatePaymentStatusInput type; updatePaymentStatus now sets processed_by from input on all status changes; payment-status-dialog passes current user context; AC-2 and AC-3 updated to specify processed_by requirement |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Date filter on paid_at excludes pending payments | Task 1 action (fetchPayments), Task 2 action (payments-page filters) | Changed date filter from paid_at to created_at with audit-added comment |
| 2 | Status transition validation missing | Task 1 action (updatePaymentStatus) | Added transition validation: pending→(completed\|failed), completed→refunded only. Throws Vietnamese error for illegal transitions. Updated AC-2 |
| 3 | Search trim before ilike | Task 1 action (fetchPayments) | Added "trim search before ilike" with audit-added comment |
| 4 | 23505 uses wrong field for constraint name | Task 1 action (payment-form-schema.ts) | Changed to use error.message field (not error.details) per 07-02 audit finding |
| 5 | Missing regression checkpoint | Task 2 verify | Added steps 6-7: verify booking list/create/detail/cancel and check-in page still work |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Permission-gated UI (who can update payment status / process refunds) | Consistent with all prior plan deferrals (07-01 through 07-03). Cross-cutting concern better addressed holistically. |
| 2 | URL-synced filters (status/method/date persisted in URL params) | Consistent with all prior plan deferrals. Nice-to-have UX improvement, not functional gap. |
| 3 | Optimistic concurrency / payment row locking | No concurrent payment processing in MVP. Consistent with prior deferrals. |

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** With processed_by applied, each payment status change now records WHO processed it and WHEN (paid_at / refunded_at). The transaction_reference field with partial unique index (idx_payments_txn_ref_unique) provides webhook replay protection. Status transition validation prevents invalid lifecycle states.

**Remaining gaps for full compliance:**
- processed_by column is nullable and not enforced by trigger — a schema-level enforcement would be stronger
- No immutable audit log separate from the payment record itself (could be modified by anyone with DB access)
- These are consistent with the project-wide deferral of audit-trail hardening to a future schema-delta plan

**Silent failure prevention:** The plan includes error states with retry, toast notifications, and constraint-specific error messages. No silent failure paths identified.

## 6. Final Release Bar

**What must be true before this plan ships:**
- processed_by is set on every status update (applied)
- Status transitions are validated at API level (applied)
- Date filtering uses created_at not paid_at (applied)
- Regression: booking list, detail, cancel, and check-in still work (verify steps added)

**Remaining risks if shipped as-is:**
- Any authenticated user can update payment status (no role check) — acceptable per project-wide deferral
- No optimistic concurrency on payment updates — acceptable for single-staff MVP usage

**Would I sign my name to this system?** Yes, after the applied changes. The payment management is a straightforward status lifecycle with proper audit attribution. The deferred items are project-wide concerns, not payment-specific gaps.

---

**Summary:** Applied 1 must-have + 5 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
