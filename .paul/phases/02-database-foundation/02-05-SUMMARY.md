---
phase: 02-database-foundation
plan: 05
subsystem: database
tags: [postgres, supabase, migrations, bookings, tickets, payments, customers]

requires:
  - phase: 02-01 (core schema)
    provides: profiles table — bookings.created_by/cancelled_by, tickets.issued_by, payments.processed_by FK target
  - phase: 02-04 (trip schema)
    provides: trips table — bookings.trip_id and tickets.trip_id FK target

provides:
  - customers table with loyalty points, CMND/CCCD, contact info
  - bookings table with auto-generated BKG-NNNNN codes via sequence DEFAULT
  - tickets table with composite FK enforcing trip_id consistency
  - payments table with 1:1 booking enforcement, audit trail columns
  - Seat double-booking prevention via partial unique index
  - QR code and transaction reference uniqueness via partial indexes
  - Booking schema updated_at triggers for all 4 tables
  - Seed data: 4 customers, 3 bookings, 5 tickets, 3 payments

affects: [02-06-rls, 02-07-triggers, phase-07-ticketing-payment]

tech-stack:
  added: []
  patterns:
    - Sequence-based DEFAULT for human-readable codes (BKG-NNNNN) — no trigger needed
    - Composite FK (booking_id, trip_id) → bookings(id, trip_id) for denormalization integrity
    - Partial unique indexes for conditional business rules (active/used seats, non-null QR codes, non-null txn refs)
    - Audit-trail nullable columns (cancelled_at/by, issued_by, processed_by, refunded_at) with CHECK guard constraints

key-files:
  created:
    - supabase/migrations/20260414100000_booking_schema.sql
    - supabase/migrations/20260414100001_booking_triggers.sql
  modified:
    - supabase/seed.sql (booking section appended at end)

key-decisions:
  - "Composite FK tickets(booking_id, trip_id) → bookings(id, trip_id): prevents trip_id drift on tickets without triggers"
  - "booking_code via sequence DEFAULT expression — simpler than trigger-based generation"
  - "UNIQUE(id, trip_id) on bookings required to support composite FK from tickets"
  - "refunded_at separate from paid_at — preserves original payment timeline alongside refund event"

patterns-established:
  - "Partial unique indexes with WHERE clause for conditional uniqueness (seats, QR codes, txn refs)"
  - "COMMENT ON INDEX for all audit-sensitive indexes documenting business rationale"
  - "CHECK constraints guard audit timestamps: cancelled_at only when status=cancelled, refunded_at only when status=refunded"

duration: ~30min
started: 2026-04-14T10:00:00Z
completed: 2026-04-14T10:30:00Z
---

# Phase 2 Plan 05: Booking Schema Summary

**customers, bookings, tickets, and payments tables with composite FK trip-drift prevention, BKG-NNNNN sequence codes, seat double-booking prevention, and audit-trail columns — the revenue core of the system.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-04-14 |
| Completed | 2026-04-14 |
| Tasks | 3 auto + 1 checkpoint |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Booking Tables Created | Pass | All 4 tables with correct columns, FKs, constraints. Composite FK on tickets(booking_id,trip_id)→bookings(id,trip_id) implemented. |
| AC-2: Business Rules Enforced | Pass | All CHECK constraints, UNIQUE constraints, partial unique indexes present. cancelled_at and refunded_at guards in place. |
| AC-3: Auto-Generated Booking Codes | Pass | booking_code_seq + DEFAULT ('BKG-'||lpad(nextval(...)::text,5,'0')) — sequential codes without trigger. |
| AC-4: Indexes Support Query Patterns | Pass | All B-tree indexes on FK/filter columns. 3 partial unique indexes with COMMENT ON INDEX. UNIQUE(id,trip_id) on bookings. |
| AC-5: Triggers Active | Pass | set_customers/bookings/tickets/payments_updated_at triggers via handle_updated_at(). |
| AC-6: Realistic Vietnamese Seed Data | Pass | 4 customers, 3 bookings (pending/confirmed/completed), 5 tickets, 3 payments. Idempotent patterns. trip_id resolved from b.trip_id for composite FK compliance. |

## Accomplishments

- Created the full booking revenue schema: customers → bookings → tickets → payments with correct FK cascade/restrict semantics
- Implemented composite FK `tickets(booking_id, trip_id) → bookings(id, trip_id)` — the must-have audit fix that prevents silent trip_id drift on tickets, which would have bypassed the seat double-booking index
- Auto-generated booking codes via sequence DEFAULT (no trigger needed) — simpler, atomic, no race conditions
- Three partial unique indexes protecting critical invariants: seat double-booking (active/used only), QR code uniqueness, payment transaction reference uniqueness per method
- Six audit-trail columns added from enterprise audit: `cancelled_at`, `cancelled_by` on bookings; `issued_by` on tickets; `refunded_at`, `processed_by` on payments — with CHECK guards

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260414100000_booking_schema.sql` | Created | All 4 tables, sequence, constraints, indexes, COMMENT ON TABLE/COLUMN/INDEX |
| `supabase/migrations/20260414100001_booking_triggers.sql` | Created | updated_at triggers for customers, bookings, tickets, payments |
| `supabase/seed.sql` | Modified | Booking seed data appended: 4 customers, 3 bookings, 5 tickets, 3 payments |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Composite FK `tickets(booking_id, trip_id) → bookings(id, trip_id)` | Prevents tickets.trip_id drifting from booking.trip_id — without it, seat double-booking partial index could be silently bypassed | Requires UNIQUE(id,trip_id) on bookings; tickets inserts must pull trip_id from b.trip_id |
| booking_code via sequence DEFAULT expression | Simpler than trigger; atomic (no race on high-concurrency insert); generates codes without extra round-trip | No trigger needed; codes auto-generate on INSERT without specifying column |
| `refunded_at` separate from `paid_at` | Preserve original payment timeline alongside refund event timestamp | Both columns nullable; only paid_at set on completion; only refunded_at set on refund |
| Partial unique indexes with COMMENT ON INDEX | Documents business rationale in schema itself, not just in code | Future 02-06 RLS / 02-07 triggers can reference comments for context |

## Deviations from Plan

None — plan executed exactly as written. All 3 auto tasks PASS on first qualify attempt. Checkpoint approved.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**
- All 5 domain schemas complete: core, fleet, route, trip, booking — full data model for 02-06 RLS
- Composite FK and partial indexes in place — RLS policies can reference ticket status for seat enforcement
- Audit-trail columns (cancelled_by, issued_by, processed_by) are FK → profiles — RLS can use auth.uid() against these
- Seed data provides realistic test data for RLS policy verification

**Concerns:**
- Audit-trail columns (cancelled_at, issued_by, etc.) need immutability triggers — flagged for 02-07 (trigger must prevent overwriting once set)
- `booking_code_seq` is not reset between test runs — if seed runs multiple times, sequence continues incrementing. BKG-00001/2/3 only guaranteed on first fresh run.

**Blockers:**
- None

---
*Phase: 02-database-foundation, Plan: 05*
*Completed: 2026-04-14*
