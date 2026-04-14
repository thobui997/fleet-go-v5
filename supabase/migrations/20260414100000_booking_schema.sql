-- ============================================================
-- FleetGo Booking Schema Migration
-- Version: 20260414100000
-- Description: Booking tables — customers, bookings, tickets, payments
-- Prerequisites: core_schema.sql, trip_schema.sql
-- ============================================================

-- ============================================================
-- Booking Code Sequence
-- ============================================================
-- Monotonic sequence for auto-generating human-readable booking codes (BKG-NNNNN).
-- Used as DEFAULT expression on bookings.booking_code — no trigger needed.
create sequence public.booking_code_seq start 1;
comment on sequence public.booking_code_seq is 'Monotonic sequence for generating human-readable booking codes (BKG-NNNNN).';

-- ============================================================
-- customers Table
-- ============================================================
-- Represents passenger customers who make bookings. Separate from employees/profiles
-- (staff) — a customer may or may not have a system account. This table is the
-- authoritative source of customer identity for revenue tracking, loyalty, and
-- passenger data on tickets.
create table public.customers (
  id                uuid        primary key default gen_random_uuid(),
  full_name         text        not null check (length(trim(full_name)) > 0),
  phone_number      text        not null unique,
  email             text        unique,
  date_of_birth     date,
  gender            text        check (gender is null or gender in ('male', 'female', 'other')),
  id_card_number    text        unique,
  address           text,
  loyalty_points    int         not null default 0 check (loyalty_points >= 0),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.customers is 'Passenger customers who make bookings. Distinct from employee/staff profiles.';
comment on column public.customers.id is 'Unique customer identifier (UUID).';
comment on column public.customers.full_name is 'Customer full name — non-empty required.';
comment on column public.customers.phone_number is 'Primary contact phone. Unique — used as natural key for idempotent seed inserts.';
comment on column public.customers.email is 'Optional email. Unique when provided.';
comment on column public.customers.date_of_birth is 'Date of birth for age-restricted or discount pricing rules.';
comment on column public.customers.gender is 'Optional gender. Constrained to male, female, or other.';
comment on column public.customers.id_card_number is 'Vietnamese CMND/CCCD. Unique when provided — used for identity on tickets.';
comment on column public.customers.address is 'Residential address. Unstructured text for flexibility.';
comment on column public.customers.loyalty_points is 'Accumulated loyalty points. Non-negative. Used for discount programs.';
comment on column public.customers.notes is 'Internal staff notes about the customer.';
comment on column public.customers.created_at is 'Record creation timestamp.';
comment on column public.customers.updated_at is 'Last update timestamp. Maintained by set_customers_updated_at trigger.';

-- ============================================================
-- bookings Table
-- ============================================================
-- A booking represents a customer purchasing seats on a specific trip.
-- One booking may cover multiple tickets (multiple passengers/seats).
-- booking_code is auto-generated via sequence DEFAULT — do not insert manually.
-- cancelled_at/cancelled_by provide audit trail for cancellation events.
create table public.bookings (
  id               uuid          primary key default gen_random_uuid(),
  booking_code     text          not null unique default ('BKG-' || lpad(nextval('public.booking_code_seq')::text, 5, '0')),
  customer_id      uuid          not null references public.customers(id) on delete restrict,
  trip_id          uuid          not null references public.trips(id) on delete restrict,
  booking_date     timestamptz   not null default now(),
  status           text          not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'refunded')),
  total_amount     numeric(12,2) not null check (total_amount >= 0),
  passenger_count  int           not null check (passenger_count > 0),
  created_by       uuid          references public.profiles(id) on delete set null,
  cancelled_at     timestamptz,
  cancelled_by     uuid          references public.profiles(id) on delete set null,
  notes            text,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),

  -- cancelled_at must only be set when status is 'cancelled' — prevents timestamp/status mismatch
  check (cancelled_at is null or status = 'cancelled'),

  -- Unique constraint on (id, trip_id) — required to support composite FK from tickets.
  -- Prevents tickets.trip_id from drifting away from the booking's actual trip.
  unique (id, trip_id)
);

comment on table public.bookings is 'A booking represents a customer purchasing one or more seats on a specific trip.';
comment on column public.bookings.id is 'Unique booking identifier (UUID).';
comment on column public.bookings.booking_code is 'Human-readable booking code. Auto-generated via booking_code_seq (BKG-NNNNN). UNIQUE. Do not insert manually.';
comment on column public.bookings.customer_id is 'FK to customers. ON DELETE RESTRICT — bookings are preserved even if customer data changes.';
comment on column public.bookings.trip_id is 'FK to trips. ON DELETE RESTRICT — trip deletions blocked if bookings exist.';
comment on column public.bookings.booking_date is 'Timestamp when booking was made. Defaults to now().';
comment on column public.bookings.status is 'Booking lifecycle status: pending → confirmed → completed or cancelled/refunded.';
comment on column public.bookings.total_amount is 'Total amount charged for this booking across all tickets.';
comment on column public.bookings.passenger_count is 'Number of passengers in this booking. Must be positive. Should match ticket count.';
comment on column public.bookings.created_by is 'Staff profile who created the booking. SET NULL on profile deletion to preserve booking history.';
comment on column public.bookings.cancelled_at is 'Timestamp when booking was cancelled. Must be NULL unless status = cancelled.';
comment on column public.bookings.cancelled_by is 'Staff profile who cancelled the booking. SET NULL on profile deletion.';
comment on column public.bookings.notes is 'Internal or customer-facing notes about the booking.';
comment on column public.bookings.created_at is 'Record creation timestamp.';
comment on column public.bookings.updated_at is 'Last update timestamp. Maintained by set_bookings_updated_at trigger.';

-- Indexes on bookings
create index idx_bookings_customer_id  on public.bookings (customer_id);
create index idx_bookings_trip_id      on public.bookings (trip_id);
create index idx_bookings_status       on public.bookings (status);
create index idx_bookings_booking_date on public.bookings (booking_date);
create index idx_bookings_created_by   on public.bookings (created_by);
create index idx_bookings_cancelled_by on public.bookings (cancelled_by);
-- Note: UNIQUE on (id, trip_id) creates a supporting index automatically.

-- ============================================================
-- tickets Table
-- ============================================================
-- Each ticket represents one passenger's seat on a trip. A booking may have
-- multiple tickets (one per seat/passenger). tickets.trip_id is denormalized from
-- the booking to enable fast trip-centric seat queries and support the composite FK
-- that enforces data integrity between the two trip_id columns.
create table public.tickets (
  id                  uuid          primary key default gen_random_uuid(),
  booking_id          uuid          not null,
  trip_id             uuid          not null,
  seat_number         text          not null check (length(trim(seat_number)) > 0),
  passenger_name      text          not null check (length(trim(passenger_name)) > 0),
  passenger_id_card   text,
  passenger_phone     text,
  price               numeric(12,2) not null check (price >= 0),
  status              text          not null default 'active' check (status in ('active', 'used', 'cancelled', 'refunded')),
  qr_code             text,
  issued_by           uuid          references public.profiles(id) on delete set null,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now(),

  -- Simple single-column FK: booking_id → bookings.id (for cascade deletes)
  foreign key (booking_id) references public.bookings(id) on delete cascade,

  -- Standalone trip FK: enables fast trip-centric queries without joining bookings
  foreign key (trip_id) references public.trips(id) on delete restrict,

  -- Composite FK (MUST-HAVE data integrity): enforces that tickets.trip_id always equals
  -- the referenced booking's trip_id. Without this, a ticket could reference a different
  -- trip than its booking, silently bypassing the seat double-booking partial unique index.
  -- Requires UNIQUE(id, trip_id) on bookings (defined above).
  foreign key (booking_id, trip_id) references public.bookings(id, trip_id) on delete cascade
);

comment on table public.tickets is 'One ticket per passenger/seat on a trip. Belongs to a booking. trip_id is denormalized from booking for seat-query performance and composite FK integrity.';
comment on column public.tickets.id is 'Unique ticket identifier (UUID).';
comment on column public.tickets.booking_id is 'FK to bookings. ON DELETE CASCADE — tickets are removed if their booking is deleted.';
comment on column public.tickets.trip_id is 'Denormalized from booking.trip_id. Enforced equal to booking.trip_id via composite FK. Supports fast trip-centric seat queries without joining bookings.';
comment on column public.tickets.seat_number is 'Seat identifier (e.g. A01, B02). Non-empty. Combined with trip_id for double-booking prevention.';
comment on column public.tickets.passenger_name is 'Full name of the passenger on this ticket. Non-empty.';
comment on column public.tickets.passenger_id_card is 'Optional Vietnamese CMND/CCCD for identity verification.';
comment on column public.tickets.passenger_phone is 'Optional passenger contact phone.';
comment on column public.tickets.price is 'Price paid for this specific seat/ticket.';
comment on column public.tickets.status is 'Ticket status: active (valid), used (boarded), cancelled, refunded.';
comment on column public.tickets.qr_code is 'Optional QR code string for boarding validation. Unique when set (partial index). NULL = not yet generated.';
comment on column public.tickets.issued_by is 'Staff profile who issued the ticket. SET NULL on profile deletion for audit trail preservation.';
comment on column public.tickets.created_at is 'Record creation timestamp.';
comment on column public.tickets.updated_at is 'Last update timestamp. Maintained by set_tickets_updated_at trigger.';

-- Indexes on tickets
create index idx_tickets_booking_id on public.tickets (booking_id);
create index idx_tickets_trip_id    on public.tickets (trip_id);
create index idx_tickets_status     on public.tickets (status);
create index idx_tickets_issued_by  on public.tickets (issued_by);

-- Partial unique index: seat double-booking prevention.
-- Only active/used tickets hold a seat. Cancelled or refunded tickets release the seat.
create unique index idx_tickets_no_double_booking on public.tickets (trip_id, seat_number)
  where status in ('active', 'used');
comment on index idx_tickets_no_double_booking is 'Business rule: a seat on a trip can only be held by one active/used ticket. Cancelled or refunded tickets release the seat.';

-- Partial unique index: QR code uniqueness for boarding validation.
-- NULLs are allowed (QR codes are optional per PROJECT.md). When set, must be unique.
create unique index idx_tickets_qr_code_unique on public.tickets (qr_code)
  where qr_code is not null;
comment on index idx_tickets_qr_code_unique is 'Business rule: QR codes must be unique across all tickets for deterministic boarding validation.';

-- ============================================================
-- payments Table
-- ============================================================
-- One payment per booking (1:1 enforced via UNIQUE on booking_id).
-- paid_at records when payment completed; refunded_at records when refunded
-- (separate columns to preserve the original payment timeline alongside refund history).
-- processed_by provides audit trail for cash transactions handled by staff.
create table public.payments (
  id                    uuid          primary key default gen_random_uuid(),
  booking_id            uuid          not null unique references public.bookings(id) on delete restrict,
  amount                numeric(12,2) not null check (amount >= 0),
  method                text          not null check (method in ('cash', 'e_wallet', 'bank_transfer')),
  status                text          not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  transaction_reference text,
  paid_at               timestamptz,
  refunded_at           timestamptz,
  processed_by          uuid          references public.profiles(id) on delete set null,
  notes                 text,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),

  -- paid_at should only be set when payment has been completed or refunded
  check (paid_at is null or status in ('completed', 'refunded')),

  -- refunded_at must only be set when status is 'refunded'
  check (refunded_at is null or status = 'refunded')
);

comment on table public.payments is '1:1 payment record per booking (enforced via UNIQUE on booking_id). Tracks payment method, status, and audit trail.';
comment on column public.payments.id is 'Unique payment identifier (UUID).';
comment on column public.payments.booking_id is 'FK to bookings. UNIQUE — one payment per booking. ON DELETE RESTRICT — payment preserved if booking is somehow deleted.';
comment on column public.payments.amount is 'Total payment amount. Should match booking.total_amount.';
comment on column public.payments.method is 'Payment method: cash, e_wallet, or bank_transfer.';
comment on column public.payments.status is 'Payment lifecycle: pending → completed or failed; completed → refunded.';
comment on column public.payments.transaction_reference is 'External reference: e-wallet txn ID, bank transfer ref, etc. Unique per (method, transaction_reference) via partial index.';
comment on column public.payments.paid_at is 'Timestamp when payment was completed. NULL until status reaches completed or refunded.';
comment on column public.payments.refunded_at is 'Timestamp when payment was refunded. Separate from paid_at to preserve original payment timeline alongside refund event.';
comment on column public.payments.processed_by is 'Staff profile who processed the payment. Audit trail for cash handling. SET NULL on profile deletion.';
comment on column public.payments.notes is 'Internal notes about the payment (e.g., reason for refund).';
comment on column public.payments.created_at is 'Record creation timestamp.';
comment on column public.payments.updated_at is 'Last update timestamp. Maintained by set_payments_updated_at trigger.';

-- Indexes on payments
create index idx_payments_status       on public.payments (status);
create index idx_payments_paid_at      on public.payments (paid_at);
create index idx_payments_processed_by on public.payments (processed_by);
-- Note: UNIQUE on booking_id creates a supporting index automatically.

-- Partial unique index: transaction reference uniqueness per payment method.
-- Protects against webhook replay, double-callback, or manual re-entry of the same
-- external transaction. NULLs allowed (not all methods produce an external reference).
create unique index idx_payments_txn_ref_unique on public.payments (method, transaction_reference)
  where transaction_reference is not null;
comment on index idx_payments_txn_ref_unique is 'Business rule: each (method, transaction_reference) pair must be unique to prevent duplicate logging of external payment events (webhook replay protection).';

-- ============================================================
-- Migration complete
-- ============================================================
-- Created: booking_code_seq, customers, bookings, tickets, payments
-- Composite FK on tickets(booking_id, trip_id) → bookings(id, trip_id) enforces
--   trip_id consistency between tickets and their parent booking.
-- Next: 20260414100001_booking_triggers.sql
-- ============================================================
