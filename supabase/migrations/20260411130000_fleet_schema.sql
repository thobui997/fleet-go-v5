-- ============================================================
-- FleetGo Fleet Schema Migration
-- Version: 20260411130000
-- Description: Fleet tables for vehicle types, vehicles, and maintenance logs
-- Prerequisites: 20260410120000_core_schema.sql must be applied first
-- ============================================================

-- ============================================================
-- vehicle_types — Vehicle type definitions with JSONB seat layouts
-- ============================================================
create table public.vehicle_types (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  seat_layout jsonb not null check (jsonb_typeof(seat_layout) = 'object'),
  total_floors int not null default 1 check (total_floors > 0),
  total_seats int not null check (total_seats > 0),
  amenities jsonb not null default '[]'::jsonb check (jsonb_typeof(amenities) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_vehicle_types_seat_layout on public.vehicle_types using gin (seat_layout);
create index idx_vehicle_types_amenities on public.vehicle_types using gin (amenities);

comment on table public.vehicle_types is 'Vehicle type definitions — stores seat layout as JSONB, amenity list, and capacity info. Each vehicle references one type.';
comment on column public.vehicle_types.id is 'Unique vehicle type identifier';
comment on column public.vehicle_types.name is 'Type name — unique identifier (e.g., "Giuong nam 40 cho")';
comment on column public.vehicle_types.description is 'Human-readable type description';
comment on column public.vehicle_types.seat_layout is 'JSONB object representing seat map structure (floors, rows, seat positions). Checked to ensure object type, not array or scalar.';
comment on column public.vehicle_types.total_floors is 'Number of floors/decks in vehicle (1 = single deck, 2 = double deck)';
comment on column public.vehicle_types.total_seats is 'Total passenger capacity';
comment on column public.vehicle_types.amenities is 'JSONB array of amenity strings, e.g., ["wifi", "charging", "ac"]. Checked to ensure array type.';
comment on column public.vehicle_types.created_at is 'Type creation timestamp';
comment on column public.vehicle_types.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- vehicles — Individual vehicle records with status tracking
-- ============================================================
create table public.vehicles (
  id uuid not null default gen_random_uuid() primary key,
  vehicle_type_id uuid not null references public.vehicle_types(id) on delete restrict,
  license_plate text not null unique,
  vin_number text unique,
  year_manufactured int check (year_manufactured >= 1990 and year_manufactured <= extract(year from now()) + 1),
  status text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  current_mileage int default 0 check (current_mileage >= 0),
  last_maintenance_date date,
  next_maintenance_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_vehicles_vehicle_type_id on public.vehicles(vehicle_type_id);
create index idx_vehicles_status on public.vehicles(status);
create index idx_vehicles_next_maintenance_date on public.vehicles(next_maintenance_date);

comment on table public.vehicles is 'Individual vehicle records. Links to vehicle_types via FK. Status tracks operational state (active/maintenance/retired).';
comment on column public.vehicles.id is 'Unique vehicle identifier';
comment on column public.vehicles.vehicle_type_id is 'References vehicle_types.id — RESTRICT prevents deleting type while vehicles exist';
comment on column public.vehicles.license_plate is 'UNIQUE NOT NULL — Vietnamese license plate format (e.g., 51A-12345). Required identifier.';
comment on column public.vehicles.vin_number is 'UNIQUE nullable — Vehicle Identification Number. Optional, unique when present.';
comment on column public.vehicles.year_manufactured is 'Model year — validated between 1990 and next year';
comment on column public.vehicles.status is 'Operational status — active, maintenance, or retired. CHECK prevents invalid values.';
comment on column public.vehicles.current_mileage is 'Current odometer reading in kilometers';
comment on column public.vehicles.last_maintenance_date is 'Most recent maintenance completion date';
comment on column public.vehicles.next_maintenance_date is 'Scheduled next maintenance due date — indexed for queries';
comment on column public.vehicles.notes is 'Free-form notes about this vehicle';
comment on column public.vehicles.created_at is 'Record creation timestamp';
comment on column public.vehicles.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- maintenance_logs — Vehicle maintenance history records
-- ============================================================
create table public.maintenance_logs (
  id uuid not null default gen_random_uuid() primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check (type in ('routine', 'repair', 'inspection', 'emergency')),
  description text not null,
  cost numeric(12,2) default 0 check (cost >= 0),
  performed_by text,
  performed_at date not null default current_date,
  next_due_date date,
  odometer_reading int check (odometer_reading >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_maintenance_logs_vehicle_id on public.maintenance_logs(vehicle_id);
create index idx_maintenance_logs_type on public.maintenance_logs(type);
create index idx_maintenance_logs_performed_at on public.maintenance_logs(performed_at);
create index idx_maintenance_logs_next_due_date on public.maintenance_logs(next_due_date);

comment on table public.maintenance_logs is 'Maintenance history for vehicles. CASCADE delete on vehicle removal — maintenance logs belong to a specific vehicle.';
comment on column public.maintenance_logs.id is 'Unique maintenance log identifier';
comment on column public.maintenance_logs.vehicle_id is 'References vehicles.id — CASCADE deletes logs when vehicle deleted';
comment on column public.maintenance_logs.type is 'Maintenance type — routine, repair, inspection, or emergency. CHECK prevents invalid values.';
comment on column public.maintenance_logs.description is 'Description of work performed';
comment on column public.maintenance_logs.cost is 'Cost in VND — numeric(12,2) supports up to ~400M USD. CHECK prevents negative values.';
comment on column public.maintenance_logs.performed_by is 'Mechanic name or shop that performed the work';
comment on column public.maintenance_logs.performed_at is 'Date maintenance was performed';
comment on column public.maintenance_logs.next_due_date is 'Recommended next maintenance due date — indexed for queries';
comment on column public.maintenance_logs.odometer_reading is 'Odometer reading at time of maintenance (km)';
comment on column public.maintenance_logs.notes is 'Additional notes about this maintenance entry';
comment on column public.maintenance_logs.created_at is 'Record creation timestamp';
comment on column public.maintenance_logs.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- Migration complete
-- ============================================================
-- Next: Apply 20260411130001_fleet_triggers.sql for updated_at triggers
-- ============================================================
