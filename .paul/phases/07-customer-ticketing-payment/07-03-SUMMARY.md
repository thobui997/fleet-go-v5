# 07-03 SUMMARY: Seat Map, QR & Ticket Operations

**Phase:** 7 - Customer, Ticketing & Payment
**Plan:** 07-03
**Status:** COMPLETE
**Date:** 2026-04-16

---

## Objective Delivered

Completed the operational ticket lifecycle with visual seat map rendering, ticket check-in operations with booking code lookup, and QR code generation/display for tickets.

---

## Files Created

### New Components
- `src/entities/vehicle-type/ui/seat-map.tsx` - Reusable SeatMap component with multi-floor layout support, runtime validation, and color-coded seat states (available/booked/selected)
- `src/pages/check-in/ui/check-in-page.tsx` - Check-in page with booking code lookup, ticket list, and individual/bulk check-in operations
- `src/pages/check-in/model/check-in-schema.ts` - Zod schema and context-aware error mapper for check-in operations
- `src/pages/check-in/index.ts` - Check-in page exports
- `src/pages/bookings/ui/ticket-qr-dialog.tsx` - Print-friendly QR code dialog for tickets

### New Files (from other tasks, unchanged in this plan)
- None (all other files were modifications)

---

## Files Modified

### Entity Layer
- `src/entities/vehicle-type/index.ts` - Added SeatMap export
- `src/entities/booking/model/types.ts` - Added vehicle_type to BookingWithDetails.trip.vehicle type
- `src/entities/booking/api/booking.api.ts` - Updated queries to include vehicle_type and qr_code; generate QR codes on ticket creation
- `src/entities/ticket/model/types.ts` - Added TicketStatus union type and TicketWithBooking interface; updated TicketInsert to include qr_code
- `src/entities/ticket/api/ticket.api.ts` - Added fetchTicketsByBookingCode, checkInTicket, checkInAllTickets functions
- `src/entities/ticket/api/ticket.queries.ts` - Added useTicketsByBookingCode, useCheckInTicket, useCheckInAllTickets hooks
- `src/entities/ticket/index.ts` - Already exported all new types and functions via `export *`

### Pages Layer
- `src/pages/bookings/ui/booking-detail-dialog.tsx` - Integrated SeatMap component; added QR button column and TicketQrDialog

### App Layer
- `src/shared/config/routes.ts` - Added CHECK_IN constant
- `src/app/lib/router.tsx` - Added CheckInPage route and import
- `src/app/layouts/app-layout/ui/sidebar.tsx` - Added ScanLine icon import and Check-in nav item in Operations group

### Dependencies
- `package.json` - Added qrcode.react dependency

---

## Acceptance Criteria Status

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Seat Map Visualization | ✅ PASS | SeatMap renders multi-floor layouts with booked/available color coding and legend |
| AC-2: Ticket Check-in by Booking Code | ✅ PASS | Check-in page with booking code lookup, ticket list, and check-in buttons working |
| AC-2b: Cancelled Booking Check-in Guard | ✅ PASS | Warning banner shown for cancelled/refunded bookings; check-in buttons disabled |
| AC-3: QR Code Generation and Display | ✅ PASS | QR codes generated on ticket creation; QR button in booking detail; dialog shows scannable QR |
| AC-4: Router and Sidebar Integration | ✅ PASS | /check-in route renders CheckInPage; sidebar shows Check-in entry in Operations group |
| AC-5: Error Handling | ✅ PASS | Context-aware PGRST116 error mapping ('lookup' vs 'check-in'); auth-expiry handling; Vietnamese messages |

---

## Deviations from Plan

### Auto-fixed Issues

**1. PostgREST Relationship Ambiguity (PGRST201)**
- **Found during:** User testing booking detail and check-in page
- **Issue:** Supabase returned "Could not embed because more than one relationship was found for 'bookings' and 'tickets'" - PGRST201 error caused by ambiguous foreign key relationships between bookings and tickets tables
- **Fix:** Added explicit foreign key constraint name `!tickets_booking_id_fkey` to nested selects in both:
  - `BOOKING_WITH_TICKETS_SELECT` in `src/entities/booking/api/booking.api.ts`
  - `fetchTicketsByBookingCode` in `src/entities/ticket/api/ticket.api.ts`
- **Files:** `src/entities/booking/api/booking.api.ts`, `src/entities/ticket/api/ticket.api.ts`
- **Verification:** Build passes; API queries now resolve tickets relationship correctly
- **Root cause:** Composite FK `(booking_id, trip_id)` created ambiguity - PostgREST couldn't determine which FK to use

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential API fix - unblocks booking detail and check-in features |
| Scope additions | 0 | None |
| Deferred | 0 | None (4 items deferred from audit, as planned) |

**Total impact:** Essential fix to resolve PostgREST relationship ambiguity. No scope creep.

---

## Technical Notes

### Seat Map Component
- Supports multi-floor layouts with continuous row letter numbering across floors (A-Z)
- Runtime validation for malformed seat_layout JSONB (checks for positive integers, handles NaN/negative)
- Modes: 'view' (non-interactive) and 'select' (clickable available seats)
- Color coding: green (available), red (booked), blue (selected)
- Legend explains seat states

### Check-in Implementation
- Context-aware error mapping: PGRST116 returns different messages for 'lookup' vs 'check-in' context
- Cancelled/refunded bookings show warning banner and disable check-in buttons
- Bulk check-in requires confirmation dialog to prevent accidental operations
- Explicit loading state: centered Loader2 with "Đang tìm kiếm..." text during search

### QR Code Generation
- QR code format: `{booking_code}-{seat_number}` (e.g., "BKG-ABCDE-A01")
- Generated on ticket creation via deterministic string construction
- TicketInsert type updated to include qr_code (removed from Omit list)
- QR dialog includes print-friendly styling and trip info

---

## Next Steps

Proceed to **Plan 07-04: Payment Management** (final plan in Phase 7).
