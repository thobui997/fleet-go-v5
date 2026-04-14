-- ============================================================
-- FleetGo RLS Policies Migration
-- Version: 20260414110001
-- Description: Row-Level Security policies for all 16 public tables
-- Prerequisites: rls_helpers.sql (has_permission, is_admin functions)
-- ============================================================
-- Policy naming convention: {table}_{operation}_{scope}
-- All policies target the 'authenticated' role — no public/anon access.
-- Reference tables: SELECT open to all authenticated; writes permission-gated.
-- Domain tables: both read and write permission-gated.
-- DELETE restricted to is_admin() on all tables (hard-delete safety net).
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
-- Reference-tier: SELECT open to all authenticated users (needed for
-- display names in UI joins). Profiles are created by handle_new_user
-- trigger (SECURITY DEFINER) — no INSERT policy needed here.
-- UPDATE restricted to own row OR admin.
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_all
  on public.profiles
  for select
  to authenticated
  using (auth.uid() is not null);

-- No INSERT policy: handle_new_user() trigger is SECURITY DEFINER and
-- creates profiles automatically. Direct INSERT via PostgREST blocked.

create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_delete_admin
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- roles
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for role
-- display in admin UI). Write operations restricted to admin only.
alter table public.roles enable row level security;
alter table public.roles force row level security;

create policy roles_select_all
  on public.roles
  for select
  to authenticated
  using (auth.uid() is not null);

create policy roles_insert_admin
  on public.roles
  for insert
  to authenticated
  with check (public.is_admin());

create policy roles_update_admin
  on public.roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy roles_delete_admin
  on public.roles
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- user_roles
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for
-- permission lookups and role display). Write restricted to admin.
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;

create policy user_roles_select_all
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() is not null);

create policy user_roles_insert_admin
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin());

create policy user_roles_update_admin
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy user_roles_delete_admin
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- vehicle_types
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for
-- vehicle form dropdowns). Write requires vehicle_types:write.
alter table public.vehicle_types enable row level security;
alter table public.vehicle_types force row level security;

create policy vehicle_types_select_all
  on public.vehicle_types
  for select
  to authenticated
  using (auth.uid() is not null);

create policy vehicle_types_insert_permission
  on public.vehicle_types
  for insert
  to authenticated
  with check (public.has_permission('vehicle_types:write'));

create policy vehicle_types_update_permission
  on public.vehicle_types
  for update
  to authenticated
  using (public.has_permission('vehicle_types:write'))
  with check (public.has_permission('vehicle_types:write'));

create policy vehicle_types_delete_admin
  on public.vehicle_types
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- stations
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for
-- route/stop lookups in booking flows). Write requires stations:write.
alter table public.stations enable row level security;
alter table public.stations force row level security;

create policy stations_select_all
  on public.stations
  for select
  to authenticated
  using (auth.uid() is not null);

create policy stations_insert_permission
  on public.stations
  for insert
  to authenticated
  with check (public.has_permission('stations:write'));

create policy stations_update_permission
  on public.stations
  for update
  to authenticated
  using (public.has_permission('stations:write'))
  with check (public.has_permission('stations:write'));

create policy stations_delete_admin
  on public.stations
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- routes
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for
-- trip scheduling and booking UI). Write requires routes:write.
alter table public.routes enable row level security;
alter table public.routes force row level security;

create policy routes_select_all
  on public.routes
  for select
  to authenticated
  using (auth.uid() is not null);

create policy routes_insert_permission
  on public.routes
  for insert
  to authenticated
  with check (public.has_permission('routes:write'));

create policy routes_update_permission
  on public.routes
  for update
  to authenticated
  using (public.has_permission('routes:write'))
  with check (public.has_permission('routes:write'));

create policy routes_delete_admin
  on public.routes
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- route_stops
-- ============================================================
-- Reference-tier: SELECT open to all authenticated (needed for
-- route detail views and stop ordering). Write requires routes:write
-- (route_stops are part of route management).
alter table public.route_stops enable row level security;
alter table public.route_stops force row level security;

create policy route_stops_select_all
  on public.route_stops
  for select
  to authenticated
  using (auth.uid() is not null);

create policy route_stops_insert_permission
  on public.route_stops
  for insert
  to authenticated
  with check (public.has_permission('routes:write'));

create policy route_stops_update_permission
  on public.route_stops
  for update
  to authenticated
  using (public.has_permission('routes:write'))
  with check (public.has_permission('routes:write'));

create policy route_stops_delete_admin
  on public.route_stops
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- employees
-- ============================================================
-- Domain-tier: employees:read required for SELECT (with self-access
-- fallback so staff can always see their own record). employees:write
-- for INSERT/UPDATE. Self-update is SELECT only — permission holders
-- manage all updates to prevent unauthorized field changes.
alter table public.employees enable row level security;
alter table public.employees force row level security;

create policy employees_select_permission_or_own
  on public.employees
  for select
  to authenticated
  using (public.has_permission('employees:read') or user_id = auth.uid());

create policy employees_insert_permission
  on public.employees
  for insert
  to authenticated
  with check (public.has_permission('employees:write'));

create policy employees_update_permission
  on public.employees
  for update
  to authenticated
  using (public.has_permission('employees:write'))
  with check (public.has_permission('employees:write'));

create policy employees_delete_admin
  on public.employees
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- vehicles
-- ============================================================
-- Domain-tier: vehicles:read/write permission gates all access.
alter table public.vehicles enable row level security;
alter table public.vehicles force row level security;

create policy vehicles_select_permission
  on public.vehicles
  for select
  to authenticated
  using (public.has_permission('vehicles:read'));

create policy vehicles_insert_permission
  on public.vehicles
  for insert
  to authenticated
  with check (public.has_permission('vehicles:write'));

create policy vehicles_update_permission
  on public.vehicles
  for update
  to authenticated
  using (public.has_permission('vehicles:write'))
  with check (public.has_permission('vehicles:write'));

create policy vehicles_delete_admin
  on public.vehicles
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- maintenance_logs
-- ============================================================
-- Domain-tier: maintenance:read/write permission gates all access.
alter table public.maintenance_logs enable row level security;
alter table public.maintenance_logs force row level security;

create policy maintenance_logs_select_permission
  on public.maintenance_logs
  for select
  to authenticated
  using (public.has_permission('maintenance:read'));

create policy maintenance_logs_insert_permission
  on public.maintenance_logs
  for insert
  to authenticated
  with check (public.has_permission('maintenance:write'));

create policy maintenance_logs_update_permission
  on public.maintenance_logs
  for update
  to authenticated
  using (public.has_permission('maintenance:write'))
  with check (public.has_permission('maintenance:write'));

create policy maintenance_logs_delete_admin
  on public.maintenance_logs
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- trips
-- ============================================================
-- Domain-tier: trips:read/write permission gates all access.
alter table public.trips enable row level security;
alter table public.trips force row level security;

create policy trips_select_permission
  on public.trips
  for select
  to authenticated
  using (public.has_permission('trips:read'));

create policy trips_insert_permission
  on public.trips
  for insert
  to authenticated
  with check (public.has_permission('trips:write'));

create policy trips_update_permission
  on public.trips
  for update
  to authenticated
  using (public.has_permission('trips:write'))
  with check (public.has_permission('trips:write'));

create policy trips_delete_admin
  on public.trips
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- trip_staff
-- ============================================================
-- Domain-tier: trips:read gates SELECT with self-access fallback.
-- Drivers and assistants can see their own assignments even without
-- explicit trips:read permission (defense-in-depth: they have it in
-- the seed, but this guards against misconfiguration).
-- The subquery resolves user → employee_id to match trip_staff.employee_id.
alter table public.trip_staff enable row level security;
alter table public.trip_staff force row level security;

create policy trip_staff_select_permission_or_own
  on public.trip_staff
  for select
  to authenticated
  using (
    public.has_permission('trips:read')
    or employee_id in (
      select id from public.employees where user_id = auth.uid()
    )
  );

create policy trip_staff_insert_permission
  on public.trip_staff
  for insert
  to authenticated
  with check (public.has_permission('trips:write'));

create policy trip_staff_update_permission
  on public.trip_staff
  for update
  to authenticated
  using (public.has_permission('trips:write'))
  with check (public.has_permission('trips:write'));

create policy trip_staff_delete_admin
  on public.trip_staff
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- customers
-- ============================================================
-- Domain-tier: customers:read/write permission gates all access.
alter table public.customers enable row level security;
alter table public.customers force row level security;

create policy customers_select_permission
  on public.customers
  for select
  to authenticated
  using (public.has_permission('customers:read'));

create policy customers_insert_permission
  on public.customers
  for insert
  to authenticated
  with check (public.has_permission('customers:write'));

create policy customers_update_permission
  on public.customers
  for update
  to authenticated
  using (public.has_permission('customers:write'))
  with check (public.has_permission('customers:write'));

create policy customers_delete_admin
  on public.customers
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- bookings
-- ============================================================
-- Domain-tier: bookings:read/write permission gates all access.
-- Audit-attribution WITH CHECK: prevents staff from inserting bookings
-- attributed to another user (created_by must be NULL or own uid).
alter table public.bookings enable row level security;
alter table public.bookings force row level security;

create policy bookings_select_permission
  on public.bookings
  for select
  to authenticated
  using (public.has_permission('bookings:read'));

create policy bookings_insert_permission
  on public.bookings
  for insert
  to authenticated
  with check (
    public.has_permission('bookings:write')
    and (created_by is null or created_by = auth.uid())
  );

create policy bookings_update_permission
  on public.bookings
  for update
  to authenticated
  using (public.has_permission('bookings:write'))
  with check (public.has_permission('bookings:write'));

create policy bookings_delete_admin
  on public.bookings
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- tickets
-- ============================================================
-- Domain-tier: bookings:read/write permission gates all access
-- (tickets are part of the booking domain).
-- Audit-attribution WITH CHECK: issued_by must be NULL or own uid.
alter table public.tickets enable row level security;
alter table public.tickets force row level security;

create policy tickets_select_permission
  on public.tickets
  for select
  to authenticated
  using (public.has_permission('bookings:read'));

create policy tickets_insert_permission
  on public.tickets
  for insert
  to authenticated
  with check (
    public.has_permission('bookings:write')
    and (issued_by is null or issued_by = auth.uid())
  );

create policy tickets_update_permission
  on public.tickets
  for update
  to authenticated
  using (public.has_permission('bookings:write'))
  with check (public.has_permission('bookings:write'));

create policy tickets_delete_admin
  on public.tickets
  for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- payments
-- ============================================================
-- Domain-tier: payments:read/write permission gates all access.
-- Audit-attribution WITH CHECK: processed_by must be NULL or own uid.
alter table public.payments enable row level security;
alter table public.payments force row level security;

create policy payments_select_permission
  on public.payments
  for select
  to authenticated
  using (public.has_permission('payments:read'));

create policy payments_insert_permission
  on public.payments
  for insert
  to authenticated
  with check (
    public.has_permission('payments:write')
    and (processed_by is null or processed_by = auth.uid())
  );

create policy payments_update_permission
  on public.payments
  for update
  to authenticated
  using (public.has_permission('payments:write'))
  with check (public.has_permission('payments:write'));

create policy payments_delete_admin
  on public.payments
  for delete
  to authenticated
  using (public.is_admin());
