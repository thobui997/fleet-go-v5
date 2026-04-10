-- ============================================================
-- FleetGo Core Triggers Migration
-- Version: 20260410120001
-- Description: Essential triggers for core tables
-- Prerequisites: 20260410120000_core_schema.sql must be applied first
-- ============================================================

-- ============================================================
-- Reusable updated_at trigger function
-- Automatically updates updated_at column on row modification
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.handle_updated_at() is 'Automatically sets updated_at to now() on UPDATE. Used by all core tables.';

-- ============================================================
-- updated_at triggers for all core tables
-- ============================================================

-- profiles updated_at trigger
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- roles updated_at trigger
create trigger set_roles_updated_at
  before update on public.roles
  for each row execute function public.handle_updated_at();

-- user_roles updated_at trigger
create trigger set_user_roles_updated_at
  before update on public.user_roles
  for each row execute function public.handle_updated_at();

-- employees updated_at trigger
create trigger set_employees_updated_at
  before update on public.employees
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Auto-create profile on user signup
-- Runs in auth system context, requires SECURITY DEFINER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Automatically creates a profile row when a new user signs up via Supabase Auth. Uses SECURITY DEFINER with SET search_path = public to prevent search path injection attacks.';

-- Trigger on auth.users to call handle_new_user()
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Migration complete
-- ============================================================
-- Next: Run seed.sql to populate development data
-- ============================================================
