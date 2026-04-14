-- ============================================================
-- FleetGo Booking Triggers Migration
-- Version: 20260414100001
-- Description: updated_at triggers for booking tables
-- Prerequisites: 20260410120001_core_triggers.sql (handle_updated_at function)
-- Prerequisites: 20260414100000_booking_schema.sql (customers, bookings, tickets, payments)
-- ============================================================

-- ============================================================
-- Customers Table Trigger
-- ============================================================
create trigger set_customers_updated_at
  before update on public.customers
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- Bookings Table Trigger
-- ============================================================
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- Tickets Table Trigger
-- ============================================================
create trigger set_tickets_updated_at
  before update on public.tickets
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- Payments Table Trigger
-- ============================================================
create trigger set_payments_updated_at
  before update on public.payments
  for each row
  execute function public.handle_updated_at();

-- ============================================================
-- Migration complete
-- ============================================================
-- Booking schema now has auto-updated updated_at timestamps
-- ============================================================
