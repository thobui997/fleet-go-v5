-- ============================================================
-- FleetGo Core Schema Migration
-- Version: 20260410120000
-- Description: Core tables for user management and roles
-- ============================================================

-- ============================================================
-- profiles — Extends auth.users, single source of truth for user data
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_email on public.profiles(email);

comment on table public.profiles is 'Application user profiles — extends Supabase auth.users. Single source of truth for user contact data.';
comment on column public.profiles.id is 'References auth.users.id — set by trigger on user signup';
comment on column public.profiles.email is 'Email address — copied from auth.users.email on profile creation';
comment on column public.profiles.full_name is 'Full display name — supports Vietnamese characters';
comment on column public.profiles.phone is 'Contact phone number — Vietnamese format';
comment on column public.profiles.avatar_url is 'Optional profile picture URL';
comment on column public.profiles.created_at is 'Profile creation timestamp';
comment on column public.profiles.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- roles — Dynamic role definitions with JSONB permissions
-- ============================================================
create table public.roles (
  id uuid not null default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  permissions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(permissions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_roles_permissions on public.roles using gin (permissions);

comment on table public.roles is 'Dynamic role definitions — permissions stored as JSONB array of strings';
comment on column public.roles.id is 'Unique role identifier';
comment on column public.roles.name is 'Role name — unique identifier (e.g., "admin", "driver")';
comment on column public.roles.description is 'Human-readable role description';
comment on column public.roles.permissions is 'JSONB array of permission strings, e.g. ["vehicles:read", "vehicles:write"]. Queried with @> operator.';
comment on column public.roles.created_at is 'Role creation timestamp';
comment on column public.roles.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- user_roles — Junction table with composite primary key
-- ============================================================
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index idx_user_roles_role_id on public.user_roles(role_id);

comment on table public.user_roles is 'Junction table — links users to their assigned roles. Composite PK eliminates redundant surrogate key.';
comment on column public.user_roles.user_id is 'References profiles.id — cascades on profile delete';
comment on column public.user_roles.role_id is 'References roles.id — cascades on role delete';
comment on column public.user_roles.created_at is 'Assignment timestamp';
comment on column public.user_roles.user_id is 'Part of composite primary key';
comment on column public.user_roles.role_id is 'Part of composite primary key';

-- ============================================================
-- employees — Employment-specific data only (no user data duplication)
-- ============================================================
create table public.employees (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid unique references public.profiles(id) on delete set null,
  hire_date date,
  license_number text unique,
  license_expiry date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_employees_user_id on public.employees(user_id);
create index idx_employees_is_active on public.employees(is_active);
create index idx_employees_license_expiry on public.employees(license_expiry);

comment on table public.employees is 'Staff employment records. User data (name, email, phone) comes from profiles via user_id FK. Join employees→profiles to get staff details.';
comment on column public.employees.id is 'Unique employee identifier';
comment on column public.employees.user_id is 'UNIQUE — enforces 1:1 relationship with profiles. Nullable for edge cases (PostgreSQL UNIQUE allows multiple NULLs). SET NULL on profile delete preserves employment record.';
comment on column public.employees.hire_date is 'Employee hire date';
comment on column public.employees.license_number is 'UNIQUE — driving license number. Two employees cannot share the same license. Nullable for non-driving staff.';
comment on column public.employees.license_expiry is 'License expiration date — used for 30-day expiry warning alerts';
comment on column public.employees.is_active is 'Employment status — true=active, false=inactive/terminated';
comment on column public.employees.created_at is 'Record creation timestamp';
comment on column public.employees.updated_at is 'Last update timestamp — auto-managed by trigger';

-- ============================================================
-- Seed default roles (idempotent — safe to re-run)
-- ============================================================
insert into public.roles (name, description, permissions) values
  ('admin', 'System Administrator — full access to all modules', '["*"]'::jsonb),
  ('fleet_manager', 'Fleet Manager — vehicle management module', '["vehicles:read", "vehicles:write", "vehicle_types:read", "vehicle_types:write", "maintenance:read", "maintenance:write"]'::jsonb),
  ('dispatcher', 'Dispatcher/Scheduler — routes, stations, employees, trips', '["routes:read", "routes:write", "stations:read", "stations:write", "employees:read", "trips:read", "trips:write", "schedule:read"]'::jsonb),
  ('ticketing_agent', 'Ticketing Agent — bookings, payments', '["bookings:read", "bookings:write", "payments:read", "payments:write", "customers:read", "customers:write"]'::jsonb),
  ('driver', 'Driver — view assigned trips and vehicle details', '["trips:read", "schedule:read", "vehicles:read"]'::jsonb),
  ('assistant', 'Assistant Driver — view trips and verify tickets', '["trips:read", "schedule:read", "bookings:read"]'::jsonb)
on conflict (name) do nothing;

-- ============================================================
-- Migration complete
-- ============================================================
-- Next: Apply 20260410120001_core_triggers.sql for triggers
-- ============================================================
