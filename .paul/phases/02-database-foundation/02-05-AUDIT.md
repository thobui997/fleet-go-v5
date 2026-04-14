# Enterprise Plan Audit Report

**Plan:** .paul/phases/02-database-foundation/02-05-PLAN.md
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (now ready after applied fixes)

---

## 1. Executive Verdict

The plan as originally drafted was **conditionally acceptable** with one release-blocking integrity gap and several audit-trail omissions. With the applied fixes, the plan is now enterprise-ready for execution.

Would I approve this for production as-originally-drafted? **No** — the tickets.trip_id denormalization without referential integrity was a silent-corruption risk. With the composite FK fix applied, **yes**.

The plan's strength is its clean separation of concerns (schema now, RLS 02-06, triggers 02-07). The weakness was treating "denormalized for performance" as a license to skip integrity enforcement.

## 2. What Is Solid

- **Sequence-based booking_code generation** — server-side DEFAULT via sequence is atomic, race-safe, and simpler than trigger-based generation. No changes needed.
- **Partial unique index for seat double-booking** — correct PostgreSQL idiom, allows cancelled/refunded tickets to release the seat. Good enterprise-grade choice.
- **1:1 booking/payment via UNIQUE(booking_id)** — cleaner than a separate PK; enforces cardinality at DB level.
- **ON DELETE RESTRICT on payment FK** — correct for financial records (prevents silent loss).
- **Idempotent seed pattern (SELECT-based FK resolution, WHERE NOT EXISTS)** — follows established project convention, safe for re-runs.
- **Explicit scope boundaries** — deferring RLS/triggers to 02-06/02-07 is the correct architectural sequencing.
- **CHECK constraints on length(trim(...)) for text NOT NULL** — prevents empty-string sentinel data, matching prior schema conventions.

## 3. Enterprise Gaps Identified

### MUST-HAVE

1. **Denormalized `tickets.trip_id` without referential integrity.**
   The plan justifies `tickets.trip_id` as a denormalization from `bookings.trip_id` for fast seat-availability queries. However, nothing prevents `tickets.trip_id` from drifting to a value different than `bookings.trip_id`. If this happens, the seat double-booking partial unique index on `tickets(trip_id, seat_number)` is silently bypassed — two tickets with different trip_id values can both reference the same booking and hold "active" status on the same seat. This is a fundamental data-integrity hole that would fail a real audit.

   **Fix:** UNIQUE constraint on `bookings(id, trip_id)` + composite FK on `tickets(booking_id, trip_id) → bookings(id, trip_id)`. This is PostgreSQL-idiomatic and zero-cost at query time.

### STRONGLY RECOMMENDED (Audit Trail)

2. **No `issued_by` on tickets.** Who issued this ticket? In a cash-handling ticketing business, the agent-of-record is audit-critical. Without it, post-incident reconstruction is impossible.

3. **No `processed_by` on payments.** Same concern — for cash transactions especially, you need to know which staff member took the money. Failing a SOC 2 cash-handling control here is trivial.

4. **No `cancelled_at` / `cancelled_by` on bookings.** A status flip from `confirmed` → `cancelled` tells you the booking was cancelled but not *when* or *by whom*. Dispute resolution and fraud investigation demand both.

### STRONGLY RECOMMENDED (Integrity & Idempotency)

5. **No uniqueness on `payments.transaction_reference`.** If an e-wallet provider sends a duplicate webhook (replay, retry, double-callback), nothing prevents inserting a second payment record with the same external reference. In payments, this is the worst kind of silent failure.

6. **No `refunded_at` on payments.** The plan's CHECK `paid_at IS NULL OR status IN ('completed','refunded')` conflates paid and refunded into one timestamp. Auditors need to reconstruct the full timeline: when was it paid, when was it refunded. Separate columns.

7. **No uniqueness on `tickets.qr_code`.** If QR codes are used for boarding validation (per PROJECT.md), duplicates create non-deterministic boarding. First-scan-wins leaves the second passenger stranded with a "valid" ticket.

### CAN SAFELY DEFER

8. `passenger_count` vs `count(tickets)` consistency — requires a trigger; 02-07 scope.
9. `SUM(tickets.price)` vs `bookings.total_amount` consistency — same; 02-07 scope.
10. Booking status transition validation (e.g., can't go from `completed` back to `pending`) — 02-07 scope.
11. Partial refund amount tracking — explicit feature scope, not MVP.
12. loyalty_points accrual on completed bookings — 02-07 trigger scope.
13. Soft-delete / PDPA right-to-delete on customers — feature scope, not schema-layer concern.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Denormalized tickets.trip_id lacks referential integrity — silent seat-conflict bypass risk | AC-1, AC-2, AC-4, Task 1 (bookings and tickets sections), Task 1 `<verify>`, Checkpoint, Verification, Success criteria | Added UNIQUE(id, trip_id) on bookings; added composite FK tickets(booking_id, trip_id) → bookings(id, trip_id); added drift-rejection verification test |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 2 | Missing issued_by audit column on tickets | AC-1, AC-4, Task 1 (tickets section), success criteria | Added `issued_by uuid FK → profiles(id) ON DELETE SET NULL` + index |
| 3 | Missing processed_by audit column on payments | AC-1, AC-4, Task 1 (payments section), success criteria | Added `processed_by uuid FK → profiles(id) ON DELETE SET NULL` + index |
| 4 | Missing cancelled_at/cancelled_by on bookings | AC-1, AC-2, AC-4, Task 1 (bookings section), success criteria | Added both columns + index on cancelled_by + CHECK constraint (cancelled_at IS NULL OR status = 'cancelled') |
| 5 | Missing transaction_reference uniqueness | AC-2, AC-4, Task 1 (payments section), verification, checkpoint | Added partial unique index on payments(method, transaction_reference) WHERE transaction_reference IS NOT NULL + COMMENT + replay test |
| 6 | Missing refunded_at on payments | AC-1, AC-2, Task 1 (payments section), success criteria | Added `refunded_at timestamptz` + CHECK (refunded_at IS NULL OR status = 'refunded') |
| 7 | Missing qr_code uniqueness on tickets | AC-2, AC-4, Task 1 (tickets section), verification, checkpoint | Added partial unique index on tickets(qr_code) WHERE qr_code IS NOT NULL + COMMENT + boarding-duplicate test |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 8 | passenger_count vs count(tickets) consistency | Requires trigger — 02-07 scope. Schema-layer concern is defining the data structure; enforcement is trigger territory. |
| 9 | SUM(tickets.price) vs bookings.total_amount consistency | Same — 02-07 trigger scope. |
| 10 | Booking status transition validation | State-machine enforcement belongs in 02-07 triggers. |
| 11 | Partial refund amount tracking | Feature scope (not MVP per PROJECT.md). Adding columns speculatively violates YAGNI. |
| 12 | loyalty_points accrual trigger | 02-07 trigger scope. |
| 13 | Soft-delete for PDPA right-to-delete | Regulatory/feature concern; not schema-layer. Would require row-level access controls, retention policy, and admin tooling out of MVP scope. |

## 5. Audit & Compliance Readiness

**With applied fixes:**

- **Defensible audit evidence:** YES. Every booking, ticket, and payment now carries the identity of the staff member who created/cancelled/issued/processed it. Post-incident reconstruction is possible from DB alone.
- **Prevents silent failures:** YES. Composite FK blocks ticket-trip drift at write time (the worst failure mode is now loud). Webhook replay is blocked by transaction_reference uniqueness. Duplicate QR codes are blocked at write time.
- **Supports post-incident reconstruction:** YES. `paid_at` + `refunded_at` + `cancelled_at` preserve full temporal history. `processed_by` + `issued_by` + `cancelled_by` preserve attribution.
- **Clear ownership and accountability:** The schema layer is clear. RLS (02-06) will scope who can read/write these audit columns — a future auditor will want to verify that RLS prevents staff from editing each other's audit records.

**Remaining concern for 02-06 (RLS):** The `cancelled_by`, `created_by`, `issued_by`, `processed_by` columns must be **immutable after insert** via RLS or triggers — otherwise a staff member could rewrite the audit trail. Flag this for 02-07 trigger scope (immutability triggers).

**Remaining concern for feature work:** PDPA right-to-delete for customer PII. Not a schema problem, but `id_card_number` is explicitly personal data under Vietnamese privacy law. Any delete or pseudonymization pathway must be designed before production.

## 6. Final Release Bar

**Before this plan ships:**
- [x] Composite FK integrity applied
- [x] Audit-trail columns applied across bookings/tickets/payments
- [x] Transaction reference uniqueness applied
- [x] QR code uniqueness applied
- [x] Temporal CHECK constraints applied
- [x] Verification tests added for each new constraint
- [ ] Execute plan 02-05 (APPLY) — next step
- [ ] 02-07 must add immutability triggers for audit-trail columns (flag for that plan)
- [ ] 02-06 must define RLS that respects audit-column immutability

**Remaining risks if shipped as-is (with applied fixes):**
- Ticket price ↔ booking total_amount drift (deferred to 02-07 trigger) — caught at application layer for now
- Passenger count ↔ ticket count drift (deferred to 02-07 trigger) — same

**Would I sign my name to this system?** Yes, as a schema layer ready for the RLS and trigger layers to be built on top. The integrity floor is now solid enough to prevent silent data corruption.

---

**Summary:** Applied 1 must-have + 6 strongly-recommended upgrades. Deferred 6 items (all properly scoped to later plans or explicit feature work).
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
