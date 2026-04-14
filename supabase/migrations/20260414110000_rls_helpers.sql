-- ============================================================
-- FleetGo RLS Helper Functions Migration
-- Version: 20260414110000
-- Description: SECURITY DEFINER helper functions for RLS policy expressions
-- Prerequisites: core_schema.sql (user_roles, roles tables with permissions JSONB)
-- ============================================================

-- ============================================================
-- has_permission(text) — Dynamic Permission Check
-- ============================================================
-- Returns true if the currently authenticated user holds any role
-- whose permissions JSONB contains the requested permission string
-- OR contains the wildcard '*'.
--
-- Marked STABLE so PostgreSQL can evaluate once per query rather
-- than per-row when used in RLS policy expressions — safe because
-- auth.uid() and role assignments do not change within a transaction.
--
-- SECURITY DEFINER so the function can read user_roles and roles
-- regardless of those tables' own RLS policies (which would otherwise
-- block the lookup for users without explicit read permissions).
create or replace function public.has_permission(required_permission text)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and (
        r.permissions @> jsonb_build_array(required_permission)
        or r.permissions @> '["*"]'::jsonb
      )
  );
  -- auth.uid() returns NULL for anon; NULL = UUID is never true in SQL,
  -- so EXISTS returns false (not NULL) when unauthenticated.
$$;

comment on function public.has_permission(text) is
  'Returns true if the current authenticated user has the specified permission via any assigned role. '
  'Checks permissions JSONB array for exact match or wildcard (*). '
  'Returns false for unauthenticated (anon) callers. '
  'STABLE — evaluated once per query by planner, not per-row. '
  'SECURITY DEFINER — reads user_roles/roles bypassing their RLS.';

-- ============================================================
-- is_admin() — Admin Wildcard Check
-- ============================================================
-- Returns true if the currently authenticated user holds any role
-- whose permissions JSONB contains the wildcard '*' (full access).
-- Equivalent to has_permission('*') but expressed directly for clarity.
--
-- Used as a safe DELETE guard across all tables — only administrators
-- can hard-delete records (most deletions should be soft-deletes via
-- status changes).
--
-- Same STABLE + SECURITY DEFINER guarantees as has_permission().
create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.permissions @> '["*"]'::jsonb
  );
  -- auth.uid() returns NULL for anon; NULL = UUID is never true in SQL,
  -- so EXISTS returns false (not NULL) when unauthenticated.
$$;

comment on function public.is_admin() is
  'Returns true if the current authenticated user holds a role with wildcard (*) permissions. '
  'Used as DELETE guard on all tables — only admins can hard-delete records. '
  'STABLE — evaluated once per query by planner, not per-row. '
  'SECURITY DEFINER — reads user_roles/roles bypassing their RLS.';

-- ============================================================
-- Access Control on Helper Functions
-- ============================================================
-- Prevent the anon role from calling permission-check functions.
-- Only authenticated users should be able to invoke these helpers —
-- anon callers have no auth.uid() and would always receive false,
-- but blocking the call entirely prevents any abuse vector.
revoke execute on function public.has_permission(text) from public;
grant  execute on function public.has_permission(text) to authenticated;

revoke execute on function public.is_admin() from public;
grant  execute on function public.is_admin() to authenticated;
