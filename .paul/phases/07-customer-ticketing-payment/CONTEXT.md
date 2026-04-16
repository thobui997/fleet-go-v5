# Phase 7: Customer, Ticketing & Payment — Discussion Context

**Created:** 2026-04-16
**Source:** User discussion

## Phase Overview

Internal operator tooling for managing the full booking lifecycle. Bookings originate from an external customer-facing application, but internal staff can also create manual bookings (walk-in, phone). The module provides visibility and control over customers, bookings, tickets, seat assignments, payments, and check-in.

## Key Goals

1. **Customer Management** — Standalone list/profile page for viewing and managing customer records. Loyalty points deferred to a later phase.
2. **Booking List** — View, search, and filter bookings with customer and trip information. Status indicators and quick access to details.
3. **Booking Creation** — Manual booking flow for walk-in or phone customers. Includes customer selection, trip selection, seat assignment, and payment entry.
4. **Booking Detail View** — Inspect full booking information: seats, tickets, payment status, customer info. Entry point for status updates and cancellation.
5. **Booking Cancellation** — Follow booking status FSM enforced by trigger FG004. Cancellation triggers payment refund handling. Audit trail via cancelled_at/cancelled_by columns.
6. **Seat Map Visualization** — Visual seat layout showing booked/available/selected seats. Reuse or adapt the vehicle type seat layout pattern from Phase 3.
7. **QR Code Generation & Scanning** — System generates QR codes per ticket. Staff can scan QR codes for check-in verification.
8. **Payment Management** — View payment status, manually update status (e.g., mark as paid for cash transactions), mark for refund on cancellation. Payment-booking status synchronization.
9. **Ticket Status Lifecycle** — Support transitions: issued → checked-in (via QR scan), issued → cancelled/void (booking cancelled), issued → no-show (missed departure).
10. **Payment-Booking Status Sync** — Cancellation triggers appropriate payment handling (e.g., paid → refund pending/completed). Ensure booking and payment statuses remain consistent.

## Approach Notes

- **Internal operator focus** — not a customer-facing booking flow
- **Schema already exists** — customers, bookings, tickets, payments tables from Phase 2 with RLS, triggers, and constraints
- **Booking status FSM** — trigger FG004 enforces valid state transitions; UI must respect and display these
- **Seat validation** — cross-reference assigned seats against trip vehicle's seat layout (JSONB from vehicle_types)
- **QR codes** — generate on ticket creation, validate on scan during check-in
- **Manual payment updates** — staff can mark payments as paid (cash scenarios)
- **Loyalty points** — exist in schema but deferred; no UI in this phase

## Open Questions (for planning phase)

- **QR code library** — qrcode.react for generation? react-qr-reader or html5-qrcode for scanning?
- **Seat map component** — reuse Phase 3 vehicle type layout configurator or build a read-only + selection variant?
- **Booking creation flow** — single dialog, multi-step wizard (customer → trip → seats → payment), or separate pages?
- **Payment refund workflow** — manual status mark only, or structured refund tracking with amounts/dates?
- **Booking list filters** — which filter dimensions? (status, date range, customer, trip, payment status)
- **Customer search** — by name, phone, email? Existing customer lookup during booking creation?

## Dependencies

- Phase 2: Database schema (customers, bookings, tickets, payments + RLS + triggers)
- Phase 3: Vehicle types with JSON seat layouts (for seat map rendering)
- Phase 6: Trips (booking must reference a trip)

## Out of Scope

- Customer-facing self-service booking application
- Loyalty points management UI
- Automated payment gateway integration (manual status updates only)
- Live GPS tracking or real-time seat lock across concurrent users
