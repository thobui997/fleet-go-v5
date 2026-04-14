-- ============================================================
-- FleetGo Integrity Triggers Migration
-- Version: 20260414120000
-- Description: Immutability guards for audit-trail columns + bookings status state machine
-- Prerequisites: booking_schema.sql (columns exist), rls_policies.sql (RLS layer present — orthogonal but logically sequenced)
-- ============================================================

-- ============================================================
-- guard_bookings_audit_immutable
-- Set-once enforcement for audit-trail columns on bookings:
--   booking_code, created_by, cancelled_at, cancelled_by
-- Pairs with RLS WITH CHECK on INSERT from 02-06.
-- Raises SQLSTATE FG001 on any attempt to mutate a non-NULL guarded column.
-- ============================================================
create or replace function public.guard_bookings_audit_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- booking_code: customer-facing audit identifier (BKG-NNNNN) — must not mutate
  if OLD.booking_code is not null and NEW.booking_code is distinct from OLD.booking_code then
    raise exception 'bookings.booking_code is immutable once set (current=%, attempted=%)', OLD.booking_code, NEW.booking_code
      using errcode = 'FG001',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  -- created_by: originating user — must not mutate
  if OLD.created_by is not null and NEW.created_by is distinct from OLD.created_by then
    raise exception 'bookings.created_by is immutable once set (current=%, attempted=%)', OLD.created_by, NEW.created_by
      using errcode = 'FG001',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  -- cancelled_at: cancellation timestamp — must not mutate
  if OLD.cancelled_at is not null and NEW.cancelled_at is distinct from OLD.cancelled_at then
    raise exception 'bookings.cancelled_at is immutable once set (current=%, attempted=%)', OLD.cancelled_at, NEW.cancelled_at
      using errcode = 'FG001',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  -- cancelled_by: cancelling actor — must not mutate
  if OLD.cancelled_by is not null and NEW.cancelled_by is distinct from OLD.cancelled_by then
    raise exception 'bookings.cancelled_by is immutable once set (current=%, attempted=%)', OLD.cancelled_by, NEW.cancelled_by
      using errcode = 'FG001',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  return NEW;
end;
$$;

comment on function public.guard_bookings_audit_immutable() is
  'Set-once enforcement for audit-trail columns on bookings: booking_code, created_by, cancelled_at, cancelled_by. '
  'Pairs with RLS WITH CHECK on INSERT from 02-06. '
  'Raises SQLSTATE FG001 on any attempt to mutate a non-NULL guarded column. '
  'First-time assignment from NULL to a value is permitted (set-once semantics).';

drop trigger if exists guard_bookings_audit_immutable on public.bookings;
create trigger guard_bookings_audit_immutable
  before update on public.bookings
  for each row
  when (OLD.booking_code is not null or OLD.created_by is not null or OLD.cancelled_at is not null or OLD.cancelled_by is not null)
  execute function public.guard_bookings_audit_immutable();
-- Note: OLD.booking_code IS NOT NULL is always true (NOT NULL column with DEFAULT gen_booking_code()).
-- It is kept in the WHEN clause for documentation symmetry with the other guarded columns.
-- The remaining conditions short-circuit cheaply when audit columns are still NULL (common for pending bookings).

-- ============================================================
-- guard_tickets_audit_immutable
-- Set-once enforcement for tickets.issued_by.
-- Raises SQLSTATE FG002 on mutation attempt.
-- ============================================================
create or replace function public.guard_tickets_audit_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- issued_by: ticket-issuing actor — must not mutate
  if OLD.issued_by is not null and NEW.issued_by is distinct from OLD.issued_by then
    raise exception 'tickets.issued_by is immutable once set (current=%, attempted=%)', OLD.issued_by, NEW.issued_by
      using errcode = 'FG002',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  return NEW;
end;
$$;

comment on function public.guard_tickets_audit_immutable() is
  'Set-once enforcement for tickets.issued_by. '
  'Raises SQLSTATE FG002 on any attempt to mutate a non-NULL value. '
  'First-time assignment from NULL to a value is permitted.';

drop trigger if exists guard_tickets_audit_immutable on public.tickets;
create trigger guard_tickets_audit_immutable
  before update on public.tickets
  for each row
  when (OLD.issued_by is not null)
  execute function public.guard_tickets_audit_immutable();

-- ============================================================
-- guard_payments_audit_immutable
-- Set-once enforcement for payments audit columns:
--   processed_by, paid_at, refunded_at
-- Raises SQLSTATE FG003 on mutation attempt.
-- ============================================================
create or replace function public.guard_payments_audit_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- processed_by: payment processor — must not mutate
  if OLD.processed_by is not null and NEW.processed_by is distinct from OLD.processed_by then
    raise exception 'payments.processed_by is immutable once set (current=%, attempted=%)', OLD.processed_by, NEW.processed_by
      using errcode = 'FG003',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  -- paid_at: payment timestamp — must not mutate
  if OLD.paid_at is not null and NEW.paid_at is distinct from OLD.paid_at then
    raise exception 'payments.paid_at is immutable once set (current=%, attempted=%)', OLD.paid_at, NEW.paid_at
      using errcode = 'FG003',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  -- refunded_at: refund timestamp — must not mutate once set
  if OLD.refunded_at is not null and NEW.refunded_at is distinct from OLD.refunded_at then
    raise exception 'payments.refunded_at is immutable once set (current=%, attempted=%)', OLD.refunded_at, NEW.refunded_at
      using errcode = 'FG003',
            detail  = format('id=%s', NEW.id),
            hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end if;

  return NEW;
end;
$$;

comment on function public.guard_payments_audit_immutable() is
  'Set-once enforcement for payments audit columns: processed_by, paid_at, refunded_at. '
  'Raises SQLSTATE FG003 on any attempt to mutate a non-NULL value. '
  'First-time assignment from NULL to a value is permitted (set-once semantics). '
  'Does not enforce paid_at/refunded_at↔status alignment — that is handled by CHECK constraints in booking_schema.sql.';

drop trigger if exists guard_payments_audit_immutable on public.payments;
create trigger guard_payments_audit_immutable
  before update on public.payments
  for each row
  when (OLD.processed_by is not null or OLD.paid_at is not null or OLD.refunded_at is not null)
  execute function public.guard_payments_audit_immutable();

-- ============================================================
-- validate_booking_status_transition
-- Enforces the bookings lifecycle FSM:
--   pending    → {confirmed, cancelled}
--   confirmed  → {completed, cancelled}
--   completed  → {refunded}
--   cancelled  → (terminal — no transitions)
--   refunded   → (terminal — no transitions)
-- Raises SQLSTATE FG004 on any illegal transition.
-- ============================================================
create or replace function public.validate_booking_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Early return: no status change, nothing to validate
  if NEW.status = OLD.status then
    return NEW;
  end if;

  case OLD.status
    when 'pending' then
      if NEW.status not in ('confirmed', 'cancelled') then
        raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
          using errcode = 'FG004',
                detail  = format('id=%s, allowed_from_%s=%s', NEW.id, OLD.status, '{confirmed,cancelled}'),
                hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
      end if;

    when 'confirmed' then
      if NEW.status not in ('completed', 'cancelled') then
        raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
          using errcode = 'FG004',
                detail  = format('id=%s, allowed_from_%s=%s', NEW.id, OLD.status, '{completed,cancelled}'),
                hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
      end if;

    when 'completed' then
      if NEW.status != 'refunded' then
        raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
          using errcode = 'FG004',
                detail  = format('id=%s, allowed_from_%s=%s', NEW.id, OLD.status, '{refunded}'),
                hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
      end if;

    when 'cancelled' then
      -- Terminal state — no outbound transitions permitted
      raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
        using errcode = 'FG004',
              detail  = format('id=%s, allowed_from_%s=%s', NEW.id, OLD.status, '{}'),
              hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));

    when 'refunded' then
      -- Terminal state — no outbound transitions permitted
      raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
        using errcode = 'FG004',
              detail  = format('id=%s, allowed_from_%s=%s', NEW.id, OLD.status, '{}'),
              hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));

    else
      -- Unknown status — reject defensively
      raise exception 'invalid bookings.status transition: % → %', OLD.status, NEW.status
        using errcode = 'FG004',
              detail  = format('id=%s, unknown_source_status=%s', NEW.id, OLD.status),
              hint    = format('attempted_by=%s', coalesce(auth.uid()::text, 'NULL'));
  end case;

  return NEW;
end;
$$;

comment on function public.validate_booking_status_transition() is
  'Enforces the bookings lifecycle: pending → {confirmed, cancelled}; confirmed → {completed, cancelled}; completed → refunded. '
  'Cancelled and refunded are terminal. Raises SQLSTATE FG004 on illegal transition.';

drop trigger if exists validate_booking_status_transition on public.bookings;
create trigger validate_booking_status_transition
  before update on public.bookings
  for each row
  when (OLD.status is distinct from NEW.status)
  execute function public.validate_booking_status_transition();
-- The WHEN clause skips the function entirely on no-op status updates (common case).

-- ============================================================
-- Trigger fire order on public.bookings (BEFORE UPDATE)
--   1. guard_bookings_audit_immutable   (alphabetical)
--   2. set_bookings_updated_at          (from 02-05 booking_triggers.sql)
--   3. validate_booking_status_transition
-- Order is by trigger name alphabetical. All three raise independently;
-- order determines only which exception surfaces when multiple rules
-- are violated in a single UPDATE. Renaming any trigger silently
-- reorders behavior — rename with caution.
-- ============================================================

-- ============================================================
-- Migration complete
-- Phase 2 (Database Foundation) complete — 16 tables + RLS + integrity triggers
-- ============================================================
-- Rollback (manual — execute in reverse-deploy scenario):
--   drop trigger if exists validate_booking_status_transition on public.bookings;
--   drop trigger if exists guard_bookings_audit_immutable    on public.bookings;
--   drop trigger if exists guard_tickets_audit_immutable     on public.tickets;
--   drop trigger if exists guard_payments_audit_immutable    on public.payments;
--   drop function if exists public.validate_booking_status_transition();
--   drop function if exists public.guard_payments_audit_immutable();
--   drop function if exists public.guard_tickets_audit_immutable();
--   drop function if exists public.guard_bookings_audit_immutable();
-- Do NOT include this rollback as executable SQL in the migration — keep
-- it commented as operational reference for DBAs only.
-- ============================================================
