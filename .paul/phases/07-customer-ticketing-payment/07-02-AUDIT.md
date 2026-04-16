# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-customer-ticketing-payment/07-02-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is well-structured and follows established patterns. Three must-have issues were identified and applied: compensating transaction for non-atomic creation, correct price precedence logic, and semantically correct payment status transitions on cancellation. With these fixes applied, the plan is ready for execution.

The plan correctly defers visual seat map, QR codes, and standalone payment management to downstream plans (07-03, 07-04), keeping scope tight.

## 2. What Is Solid

- **Entity slice pattern:** Follows the established types → api → queries → index structure exactly. No deviation from proven pattern.
- **Error handling architecture:** mapBookingError with SQLSTATE discrimination via `error.message` (not `error.details`), consistent with the correction from the 06-02 audit.
- **Double-booking prevention:** Correctly relies on the DB partial unique index (`idx_tickets_no_double_booking`) as the authoritative safety net. Client-side availability display is informational, not a guarantee.
- **Payment sync on cancel:** Correctly identifies that payment update is a separate step after booking/ticket cancellation. The 1:1 payment-to-booking relationship (UNIQUE on booking_id) simplifies this.
- **Scope boundaries:** Explicitly lists what's deferred (seat map, QR, ticket lifecycle, payment page, confirmation workflow). No scope creep.
- **Task structure:** 3 well-defined tasks with clear files, actions, verification, and done criteria. Task 2 is large but well-specified with sub-sections per dialog.

## 3. Enterprise Gaps Identified

1. **Non-atomic booking+ticket creation without compensating transaction** — If booking insert succeeds but ticket insert fails, orphaned bookings accumulate with no tickets and wrong total_amount. The plan acknowledged non-atomicity but only suggested error toast.

2. **Incorrect price default** — Plan said "trip's base_price" but trips have `price_override` which takes precedence over route `base_price`. Wrong default means incorrect ticket prices.

3. **Semantically incorrect payment cancellation** — Plan set pending payments to 'refunded' on booking cancellation. You can't refund what was never paid. Pending → 'failed' is correct.

4. **No trip status filter in creation dropdown** — Users could create bookings on completed/cancelled trips, which is nonsensical.

5. **No search trim before ilike** — Consistent gap across previous plans, always flagged in audit.

6. **FK dropdowns without truncation warning** — Customer and trip dropdowns use large page sizes without the truncation warning pattern established in previous audits.

7. **Missing explicit 23514 CHECK mapping** — Plan had placeholder "CHECK violation message" without the actual Vietnamese text.

8. **Close guard during isPending** — Form close guard should be suppressed while mutation is in flight.

9. **Race condition between seat availability display and submission** — Not explicitly documented as expected behavior handled by the DB constraint.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Compensating transaction for booking+ticket creation | Task 1 action → createBookingWithTickets | Added: if ticket insert fails, DELETE the just-created booking (compensating transaction), then throw original error. Also updated Task 2 CRITICAL section to document compensating transaction and race condition. |
| 2 | Price default: price_override takes precedence | Task 2 action → passenger rows | Changed: "default to trip's base_price" → "default to trip.price_override ?? trip.route.base_price — price_override takes precedence over route base_price" |
| 3 | Cancel payment sync: pending → 'failed' not 'refunded' | Task 1 action → cancelBooking, AC-5 | Changed: payment status IN ('completed', 'pending') → 'refunded' split into: 'completed' → 'refunded' with refunded_at; 'pending' → 'failed'. AC-5 gherkin updated with both cases. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Trip status filter for creation dropdown | Task 2 action → Trip selection | Added: "filtered to status IN ('scheduled', 'in_progress') only — do not allow booking on completed/cancelled trips" |
| 2 | Search trim before ilike | Task 1 action → fetchBookings | Added: "Trim search before ilike" |
| 3 | FK dropdown pageSize constant + truncation warning | Task 2 action → Customer/Trip selection | Changed: "pageSize=1000 or similar" → "pageSize=FK_DROPDOWN_PAGE_SIZE (1000)" + "Show visible truncation warning when count > data.length" |
| 4 | 23514 CHECK violation mapping | Task 2 action → mapBookingError | Changed: "23514: CHECK violation message" → "23514: 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)'" + explicit default fallback string |
| 5 | Double-booking race condition documentation | Task 2 CRITICAL section | Added: "race condition between showing available seats and form submission is expected — the 23505 partial unique index is the authoritative safety net" |
| 6 | Create dialog close guard during isPending | Task 2 action → point 11 | Added: "Skip guard during isPending (mutation in progress)" |
| 7 | npm run build in Task 2 verification | Task 2 verify | Changed: "npm run build passes" → "npm run build passes with zero TypeScript errors" for consistency |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Optimistic concurrency on booking updates | Low contention scenario — TanStack Query invalidation is sufficient for MVP. Previous plans consistently deferred this. |
| 2 | Supabase RPC for atomic booking+ticket creation | Compensating transaction (must-have #1) is adequate for MVP. Proper atomicity would require DB-side RPC function, but schema is locked. |
| 3 | Booking status confirmation workflow | Explicitly scoped out in plan boundaries — status transitions managed via cancel only. Confirmation flow deferred to post-MVP. |
| 4 | Permission-gated UI | RBAC-based button visibility deferred across all phases. Consistent with prior audit deferrals. |
| 5 | URL-synced filters | Persisting filter state in URL params deferred consistently across all list pages. |

## 5. Audit & Compliance Readiness

**Audit evidence:** The compensating transaction in createBookingWithTickets ensures no orphaned bookings — a data integrity concern that would fail a financial audit. The cancel operation correctly distinguishes between 'completed' payments (→ 'refunded') and 'pending' payments (→ 'failed'), which is essential for payment reconciliation.

**Silent failure prevention:** The 23505 partial unique index on (trip_id, seat_number) WHERE status IN ('active', 'used') prevents double-booking at the database level regardless of client-side race conditions. The error is surfaced to the user via mapBookingError.

**Post-incident reconstruction:** booking_code auto-generation via DB sequence provides a monotonic, auditable trail. cancelled_at/cancelled_by columns on bookings capture cancellation events. refunded_at on payments captures refund timing.

**Ownership gap:** created_by on bookings references the staff profile who created it, but the plan doesn't specify how this is populated. In the current Supabase setup (RLS with JWT), the client could pass `created_by` from the auth context, or it could be set via a DB trigger. The plan should set it in the API layer from the current user's profile ID if available, or leave null if not (SET NULL on delete is already configured). This is a minor gap — deferred to implementation.

## 6. Final Release Bar

**Must be true before shipping:**
- All 3 must-have fixes are implemented (compensating transaction, correct price, correct payment cancel)
- npm run build passes with zero errors
- Double-booking prevention works (verified via 23505 error on duplicate seat)
- Cancel correctly syncs payment status for both 'completed' and 'pending' scenarios

**Remaining risks if shipped as-is:**
- Non-atomic cancellation (booking/tickets/payment updated separately) — failure mid-way leaves inconsistent state, but operation is idempotent and retryable
- No booking confirmation workflow — bookings stay in 'pending' until cancelled or completed externally
- created_by not explicitly specified in plan — implementation should set it from auth context

**Verdict: Would approve for production** with the applied fixes. The remaining gaps are either explicitly deferred to downstream plans or are idempotent-recoverable operational risks.

---

**Summary:** Applied 3 must-have + 7 strongly-recommended upgrades. Deferred 5 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
