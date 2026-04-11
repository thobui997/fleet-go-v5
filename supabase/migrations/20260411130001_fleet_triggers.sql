-- ============================================================
-- FleetGo Fleet Triggers Migration
-- Version: 20260411130001
-- Description: updated_at triggers for fleet tables
-- Prerequisites: 20260410120001_core_triggers.sql must be applied first (provides handle_updated_at function)
-- ============================================================

-- ============================================================
-- updated_at triggers for fleet tables
-- Reuse handle_updated_at() function from core triggers migration
-- ============================================================

-- vehicle_types updated_at trigger
create trigger set_vehicle_types_updated_at
  before update on public.vehicle_types
  for each row execute function public.handle_updated_at();

-- vehicles updated_at trigger
create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.handle_updated_at();

-- maintenance_logs updated_at trigger
create trigger set_maintenance_logs_updated_at
  before update on public.maintenance_logs
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Migration complete
-- ============================================================
-- Next: Run updated seed.sql to populate fleet data
-- ============================================================
