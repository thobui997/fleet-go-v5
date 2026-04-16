# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-customer-ticketing-payment/07-03-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — after applied fixes, plan is ready for execution.**

The plan is well-structured with clear task boundaries, proper FSD layering, and follows established entity slice patterns. Two correctness bugs would have caused TypeScript compilation failures or confusing user-facing errors. Five additional robustness improvements strengthen the check-in workflow against operational edge cases.

## 2. What Is Solid

- **Task structure**: 3 tasks map cleanly to 3 distinct concerns (seat map, check-in, QR codes). No task cross-contamination.
- **FSD boundaries**: SeatMap placed in vehicle-type entity (owns seat_layout data), check-in as a separate page layer, QR dialog co-located with booking pages. Correct layering.
- **Error mapping pattern**: `mapCheckInError` follows established pattern from all prior phases (mapSupabaseError, mapBookingError, etc.). Consistent.
- **Ticket status type**: Replacing `string` with `TicketStatus` union type is a correctness improvement that prevents invalid status assignments at compile time.
- **QR code format**: Deterministic `booking_code-seat_number` is unique (booking_code UNIQUE, seat_number UNIQUE per booking), human-readable, and requires no random generation.
- **Boundaries section**: Correctly protects customer entity, create dialog, shared UI, auth system. Scope limits are reasonable and defensible.

## 3. Enterprise Gaps Identified

1. **TicketInsert type excludes qr_code** — Plan Task 3 says "Include qr_code in the ticket insert payload" but `TicketInsert = Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'qr_code' | 'issued_by'>` explicitly Omits qr_code. Adding qr_code to a typed object would fail TypeScript compilation. Must remove qr_code from the Omit list.

2. **PGRST116 error context conflation** — `mapCheckInError` maps PGRST116 to "Không tìm thấy đặt vé với mã này" (booking not found). But `checkInTicket()` uses `.update().eq('status','active').select().single()` which throws PGRST116 when the ticket is already processed (0 rows matched). Same error code, completely different meaning. Users checking in a ticket would see "booking not found" instead of "ticket already used" — misleading and operationally confusing.

3. **No runtime validation for seat_layout structure** — SeatMap receives `Record<string, unknown>` and accesses `rows`/`seats_per_row` without validation. Malformed JSONB (missing fields, string values, negative numbers) would crash the component. This is a real risk since seat_layout is user-editable JSONB.

4. **No guard against check-in on cancelled bookings** — If an operator searches a cancelled booking's code, the page shows tickets with check-in buttons. The booking status badge says "cancelled" but check-in buttons remain active. While `.eq('status', 'active')` on the update prevents actual check-in of cancelled tickets (they're already 'cancelled' status), the UI allows clicking, producing a confusing error rather than a clear explanation.

5. **Bulk check-in has no confirmation** — "Check-in tất cả" checks in all active tickets at once with a single click. Accidental click is operationally costly to reverse (no bulk "undo check-in"). A `confirm()` dialog is the minimum safeguard.

6. **TicketQrDialog missing trip info** — Plan says dialog shows "trip info" below the QR code, but the props interface only includes `booking_code`, `seat_number`, `passenger_name`, `status`. No route name, departure time, or origin/destination — critical for a print-friendly ticket that identifies which trip the ticket belongs to.

7. **Check-in results loading state underspecified** — Plan says "Loader2 spinner during search" generically but doesn't specify that the results section (booking info + ticket table) is replaced by a centered spinner during `useTicketsByBookingCode` fetch. Without this, implementer might overlay spinner on empty content, causing layout shift.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | TicketInsert excludes qr_code — TypeScript will fail | Task 3 action | Added new step 3b: update TicketInsert to remove `qr_code` from Omit list. Updated step 3c reference to note TicketInsert now includes qr_code. Added `src/entities/ticket/model/types.ts` to Task 3 files_modified. |
| 2 | PGRST116 error conflates booking-not-found vs ticket-already-processed | Task 2 action (2e), AC-5 | mapCheckInError now accepts `context: 'lookup' \| 'check-in'` parameter. PGRST116 + context='lookup' → booking not found. PGRST116 + context='check-in' → ticket already processed. Check-in page uses `mapCheckInError(error, 'check-in')` for mutation errors. AC-5 updated with both PGRST116 scenarios. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | Seat layout malformed JSONB crashes SeatMap | Task 1 action (1a) | Added runtime validation: verify rows and seats_per_row are positive integers per floor. Show "Sơ đồ ghế không hợp lệ" fallback for malformed data. |
| 4 | Cancelled booking allows check-in clicks | Task 2 action (2f), new AC-2b | Added cancelled/refunded booking warning banner + disabled check-in buttons. Added AC-2b acceptance criterion. |
| 5 | Bulk check-in has no confirmation | Task 2 action (2f) | Added `confirm()` dialog requirement before "Check-in tất cả" execution. |
| 6 | TicketQrDialog missing trip info | Task 3 action (3d) | Added `tripInfo` prop (route_name, departure_time, origin_station, destination_station) to TicketQrDialog interface. |
| 7 | Check-in loading state underspecified | Task 2 action (2f) | Added explicit specification: results section replaced by centered Loader2 with "Đang tìm kiếm..." during fetch. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 8 | QR code predictability — booking_code-seat_number is guessable | Internal admin MVP. No customer-facing exposure. Predictable format aids debugging. Future: add random nonce or UUID. |
| 9 | Seat numbering overflow past Z (>26 rows across all floors) | Real-world coaches max ~15 rows per floor (3 floors × 15 = 45 rows still fits A-Z + extended). Default is 5 rows. Defer AA/AB pattern. |
| 10 | Permission-gated check-in UI | Follows established deferral pattern across all prior phase audits. Permission system exists (roles.permissions JSONB) but UI gating deferred. |
| 11 | Webcam QR scanning | Explicitly scoped out in plan boundaries. Manual code entry sufficient for MVP. External scanners act as keyboard input. |

## 5. Audit & Compliance Readiness

- **Defensible audit evidence**: Ticket status transitions (active → used) are row-level updates with timestamps. Supabase logs capture the operation. Adequate for MVP.
- **Silent failure prevention**: Context-aware PGRST116 mapping prevents the most dangerous silent failure — operator seeing "booking not found" when ticket was already checked in.
- **Post-incident reconstruction**: Booking code + seat_number format makes tickets traceable without database access. Good.
- **Remaining gap**: No `issued_by` population during ticket creation (column exists but not set). This was flagged in 02-05 audit and deferred. Not introduced by this plan.

## 6. Final Release Bar

**Must be true before this plan ships:**
- All 3 tasks complete with TypeScript compilation passing
- TicketInsert type updated to include qr_code (compilation gate)
- Context-aware error mapping distinguishes booking-not-found from ticket-already-processed
- Cancelled booking shows warning and disables check-in

**Risks remaining after ship:**
- Existing tickets (created before this plan) have no qr_code values. QR buttons won't appear for them. Not a bug — documented in boundaries.
- No undo for check-in operations. Operator must contact admin to reverse. Acceptable for MVP.

**Verdict: Would sign off.** Plan is production-safe after applied fixes.

---

**Summary:** Applied 2 must-have + 5 strongly-recommended upgrades. Deferred 4 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
