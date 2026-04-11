-- ============================================================
-- FleetGo Trip Schema Migration
-- Version: 20260411150000
-- Description: Trip tables for scheduled journeys and staff assignments
-- Prerequisites: core_schema.sql, fleet_schema.sql, route_schema.sql
-- ============================================================

-- ============================================================
-- trips — Scheduled journey records with route, vehicle, and timing
-- ============================================================
create table public.trips (
  id uuid not null default gen_random_uuid() primary key,
  route_id uuid not null references public.routes(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  departure_time timestamptz not null,
  estimated_arrival_time timestamptz not null,
  actual_arrival_time timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraints
  constraint trips_departure_before_estimated check (departure_time < estimated_arrival_time),
  constraint trips_actual_after_departure check (actual_arrival_time is null or actual_arrival_time > departure_time)
);

-- Indexes for common query patterns
create index idx_trips_route_id on public.trips(route_id);
create index idx_trips_vehicle_departure on public.trips(vehicle_id, departure_time);
create index idx_trips_status on public.trips(status);
create index idx_trips_departure_time on public.trips(departure_time);

-- Comments
comment on table public.trips is 'Scheduled trip/journey records linking routes, vehicles, and timing. Status tracks lifecycle (scheduled→in_progress→completed/cancelled).';
comment on column public.trips.id is 'Unique trip identifier';
comment on column public.trips.route_id is 'References routes.id — RESTRICT prevents deleting route while trips exist';
comment on column public.trips.vehicle_id is 'References vehicles.id — RESTRICT prevents deleting vehicle while trips exist';
comment on column public.trips.departure_time is 'Scheduled departure timestamp';
comment on column public.trips.estimated_arrival_time is 'Estimated arrival timestamp — must be after departure_time';
comment on column public.trips.actual_arrival_time is 'Actual arrival timestamp — filled when trip completes. NULL until completion.';
comment on column public.trips.status is 'Trip status — scheduled, in_progress, completed, or cancelled. CHECK prevents invalid values.';
comment on column public.trips.price_override is 'Optional price override in VND. When set, overrides route.base_price for this trip. CHECK prevents negative values.';
comment on column public.trips.notes is 'Free-form notes about this trip (cancellations, special events, etc.)';
comment on column public.trips.created_at is 'Record creation timestamp';
comment on column public.trips.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- trip_staff — Junction table for staff assigned to trips
-- ============================================================
create table public.trip_staff (
  trip_id uuid not null references public.trips(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  role text not null check (role in ('driver', 'assistant')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Composite primary key (junction table pattern)
  primary key (trip_id, employee_id)
);

-- Indexes for common query patterns
create index idx_trip_staff_employee_id on public.trip_staff(employee_id);
create index idx_trip_staff_role on public.trip_staff(role);

-- Partial unique index: enforces max 1 driver per trip
create unique index idx_trip_staff_one_driver
  on public.trip_staff (trip_id)
  where role = 'driver';

comment on index idx_trip_staff_one_driver is 'Business rule: each trip may have at most one driver. This partial unique index prevents assigning multiple drivers to the same trip.';

-- Comments
comment on table public.trip_staff is 'Junction table assigning staff to trips with roles (driver/assistant). CASCADE delete on trip removal. Composite PK eliminates redundant surrogate key.';
comment on column public.trip_staff.trip_id is 'References trips.id — CASCADE deletes assignments when trip deleted';
comment on column public.trip_staff.employee_id is 'References employees.id — RESTRICT prevents deleting employee while assigned to trips';
comment on column public.trip_staff.role is 'Staff role on this trip — driver or assistant. CHECK prevents invalid values.';
comment on column public.trip_staff.notes is 'Free-form notes about this assignment';
comment on column public.trip_staff.created_at is 'Assignment timestamp';
comment on column public.trip_staff.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- Migration complete
-- ============================================================
-- Next: Apply 20260411150001_trip_triggers.sql for updated_at triggers
-- ============================================================
