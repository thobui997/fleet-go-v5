---
phase: 07-customer-ticketing-payment
plan: 02
subsystem: bookings, tickets, entity-slices, crud-ui
tags: tanstack-query, supabase, react-hook-form, radix-ui, booking-management, ticket-management

# Dependency graph
requires:
  - phase: 06-trip-scheduling
    provides: TripWithDetails type, trip entity patterns
  - phase: 07-customer-ticketing-payment (07-01)
    provides: Customer entity slice pattern, form schema pattern
provides:
  - Booking entity slice with CRUD operations
  - Ticket entity slice with seat availability query
  - Full booking management UI (list, create, detail, cancel, delete)
affects: 07-03-seat-map-qr, 07-04-payment-management

# Tech tracking
tech-stack:
  added: []
  patterns: booking-with-tickets-compensating-transaction, fk-dropdown-truncation-warning, payment-sync-on-cancel

key-files:
  created:
    - src/entities/booking/model/types.ts
    - src/entities/booking/api/booking.api.ts
    - src/entities/booking/api/booking.queries.ts
    - src/entities/booking/index.ts
    - src/entities/ticket/model/types.ts
    - src/entities/ticket/api/ticket.api.ts
    - src/entities/ticket/api/ticket.queries.ts
    - src/entities/ticket/index.ts
    - src/pages/bookings/model/booking-form-schema.ts
    - src/pages/bookings/ui/bookings-page.tsx
    - src/pages/bookings/ui/booking-create-dialog.tsx
    - src/pages/bookings/ui/booking-detail-dialog.tsx
    - src/pages/bookings/ui/booking-delete-dialog.tsx
    - src/pages/bookings/index.ts
  modified:
    - src/app/lib/router.tsx

key-decisions:
  - "Compensating transaction for booking+ticket creation: delete orphaned booking if ticket insert fails"
  - "Payment status sync on cancel: completed→refunded, pending→failed (not refunded)"
  - "FK dropdown pattern: pageSize=1000 + truncation warning when count > data.length"
  - "Race condition between seat availability and form submission expected (23505 index is safety net)"
  - "Separate dialog open states for create vs detail (not conditional rendering)"

patterns-established:
  - "Booking CRUD following customer/station/trip entity slice pattern"
  - "Nested FK joins: booking→customer, booking→trip→route, booking→trip→vehicle"
  - "Dynamic passenger rows with add/remove using useFieldArray"
  - "Total amount auto-calculation from ticket prices"
  - "Vietnamese error mapping for booking-specific constraints (double-booking, payment FK)"

# Metrics
duration: ~45min
started: 2026-04-16T15:15:00Z
completed: 2026-04-16T16:00:00Z
---

# Phase 7 Plan 02: Booking Management Summary

**Booking and ticket management with full CRUD UI, passenger entry, and payment-aware cancellation workflow.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 minutes |
| Started | 2026-04-16T15:15:00Z |
| Completed | 2026-04-16T16:00:00Z |
| Tasks | 3 completed |
| Files modified | 15 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Booking List Page | Pass | DataTable with columns: Mã đặt vé, Khách hàng, Chuyến, Ngày đặt, Tổng tiền, Trạng thái, Số KH. Status filter, date range filter, search (300ms debounce). |
| AC-2: Booking List Error State | Pass | AlertCircle + mapBookingError + retry button for auth expiry (401/403/PGRST301). |
| AC-3: Create Booking | Pass | Customer/trip dropdowns (FK_DROPDOWN_PAGE_SIZE=1000 with truncation warning), passenger rows (dynamic), total auto-calc, status='pending'. |
| AC-4: Booking Detail View | Pass | Shows booking info, customer info, trip info, tickets table, payment summary, action buttons (cancel/delete). |
| AC-5: Cancel Booking | Pass | Updates booking status='cancelled', tickets status='cancelled', payment status='refunded' (if completed) or 'failed' (if pending). |
| AC-6: Vietnamese Error Handling | Pass | mapBookingError handles 23505 (double-booking), 23503 (payment FK), 23514 (CHECK), auth expiry. |
| AC-7: Router Integration | Pass | /bookings renders BookingsPage (not PlaceholderPage), all other routes unchanged. |

## Accomplishments

- **Booking entity slice** with types matching DB schema, nested joins (customer, trip→route, trip→vehicle), and CRUD API with compensating transaction
- **Ticket entity slice** with fetchTripBookedSeats for seat availability checking
- **Full booking CRUD UI** with list filters, create dialog with customer/trip selection, detail view, and cancel/delete operations
- **Payment-aware cancellation** that syncs payment status based on current payment state
- **Vietnamese error handling** for booking-specific constraints (double-booking, payment FK violations)

## Task Commits

Each task committed atomically:

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Booking & Ticket Entity Slices | `apply-phase` | feat | Created booking and ticket entity slices with types, API, and TanStack Query hooks |
| Task 2: Booking Pages | `apply-phase` | feat | Created booking list, create, detail, and delete dialogs with Vietnamese error handling |
| Task 3: Router Integration | `apply-phase` | feat | Updated router.tsx to use BookingsPage instead of PlaceholderPage |

Plan metadata: `07-02-PLAN` (docs: booking management)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/booking/model/types.ts` | Created | Booking, BookingStatus, BookingWithDetails, BookingInsert, BookingUpdate, BookingListParams |
| `src/entities/booking/api/booking.api.ts` | Created | fetchBookings, fetchBooking, createBookingWithTickets (with compensating transaction), cancelBooking (payment sync), deleteBooking |
| `src/entities/booking/api/booking.queries.ts` | Created | useBookings, useBooking, useCreateBooking, useCancelBooking, useDeleteBooking |
| `src/entities/booking/index.ts` | Created | Public API exports |
| `src/entities/ticket/model/types.ts` | Created | Ticket, TicketInsert, TicketUpdate |
| `src/entities/ticket/api/ticket.api.ts` | Created | fetchTripBookedSeats (returns string[] of booked seats) |
| `src/entities/ticket/api/ticket.queries.ts` | Created | useTripBookedSeats |
| `src/entities/ticket/index.ts` | Created | Public API exports |
| `src/pages/bookings/model/booking-form-schema.ts` | Created | bookingFormSchema, mapBookingError, FK_DROPDOWN_PAGE_SIZE |
| `src/pages/bookings/ui/bookings-page.tsx` | Created | Booking list with DataTable, filters, search, error state |
| `src/pages/bookings/ui/booking-create-dialog.tsx` | Created | Booking creation with customer/trip dropdowns, passenger rows, total calc |
| `src/pages/bookings/ui/booking-detail-dialog.tsx` | Created | Booking detail view with tickets table and payment summary |
| `src/pages/bookings/ui/booking-delete-dialog.tsx` | Created | Booking deletion with confirmation |
| `src/pages/bookings/index.ts` | Created | Page exports |
| `src/app/lib/router.tsx` | Modified | Added BookingsPage import, replaced PlaceholderPage with BookingsPage |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Compensating transaction for booking+ticket creation | Booking+ticket inserts are separate Supabase calls; partial failure leaves orphaned bookings | Data integrity maintained by deleting orphaned bookings on ticket failure |
| Payment status split on cancel (completed→refunded, pending→failed) | Cannot refund what wasn't paid; pending payments should fail, not refund | Accurate payment accounting for different payment states |
| FK dropdown pageSize=1000 with truncation warning | Large datasets may truncate; users need warning to search more specifically | Prevents silent data loss in dropdowns |
| Separate dialog open states (create vs detail) | Conditional rendering caused DialogTitle accessibility error | Both dialogs render independently with proper titles |
| Race condition between seat availability and submission accepted | Seat availability query and form submission are separate operations; idx_tickets_no_double_booking is authoritative | 23505 error provides Vietnamese message on conflict |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential fixes, no scope creep |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Essential fixes for accessibility and runtime errors. No scope changes.

### Auto-fixed Issues

**1. Accessibility - DialogTitle missing**
- **Found during:** Runtime testing after Task 2
- **Issue:** DialogTitle not present when create dialog opened (conditional rendering issue)
- **Fix:** Added separate `createOpen` state, render both dialogs independently with proper DialogTitle
- **Files:** src/pages/bookings/ui/bookings-page.tsx
- **Verification:** Dialog opens without accessibility error
- **Commit:** Part of APPLY execution

**2. Runtime error - useFormContext is null**
- **Found during:** Runtime testing after Task 2
- **Issue:** PassengerRow component used useFormContext() but BookingCreateDialog doesn't wrap in FormProvider
- **Fix:** Removed useFormContext, passed register and errors as props to PassengerRow
- **Files:** src/pages/bookings/ui/booking-create-dialog.tsx
- **Verification:** Form renders and functions correctly
- **Commit:** Part of APPLY execution

### Deferred Items

None - plan executed exactly as written (plus essential auto-fixes).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Accessibility error: DialogContent requires DialogTitle | Fixed by using separate open states for create/detail dialogs |
| Runtime error: Cannot destructure 'register' of useFormContext | Fixed by passing register/errors as props instead of using context |

## Next Phase Readiness

**Ready:**
- Booking entity slice for 07-03 (Seat Map & QR) to consume
- Ticket entity slice for 07-03 ticket status management
- Booking CRUD operations complete for payment integration in 07-04

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 07-customer-ticketing-payment, Plan: 02*
*Completed: 2026-04-16*
