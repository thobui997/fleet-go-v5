-- ============================================================
-- FleetGo Trip Triggers Migration
-- Version: 20260411150001
-- Description: updated_at triggers for trip tables
-- Prerequisites: 20260410120001_core_triggers.sql (handle_updated_at function)
-- Prerequisites: 20260411150000_trip_schema.sql (trips, trip_staff tables)
-- ============================================================

-- ============================================================
-- Trips Table Trigger
-- ============================================================
create trigger set_trips_updated_at
  before update on public.trips
  for each row
  execute function handle_updated_at();

-- ============================================================
-- Trip Staff Table Trigger
-- ============================================================
create trigger set_trip_staff_updated_at
  before update on public.trip_staff
  for each row
  execute function handle_updated_at();

-- ============================================================
-- Migration complete
-- ============================================================
-- Trip schema now has auto-updated updated_at timestamps
-- ============================================================
