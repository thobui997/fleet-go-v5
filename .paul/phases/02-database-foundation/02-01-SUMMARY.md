---
phase: 02-database-foundation
plan: 01
subsystem: database
tags: postgresql, supabase, triggers, jsonb, schema-design, normalization

# Dependency graph
requires:
  - phase: 01-foundation-auth
    provides: Supabase project setup, auth configuration
provides:
  - Core user management schema (profiles, roles, user_roles, employees)
  - Auto-profile creation trigger on user signup
  - Foundation tables for all feature modules to reference
affects: all feature phases (03-08), 02-06 (rls-policies)

# Tech tracking
tech-stack:
  added: []
  patterns: [normalized-schema, composite-primary-keys, jsonb-permissions, trigger-auto-populate]

key-files:
  created:
    - supabase/migrations/20260410120000_core_schema.sql
    - supabase/migrations/20260410120001_core_triggers.sql
    - supabase/seed.sql
    - supabase/README.md
  modified: []

key-decisions:
  - "User data normalization: profiles is single source of truth for contact data (full_name, email, phone)"
  - "Composite PK on user_roles (user_id, role_id) instead of surrogate key"
  - "Employees.user_id UNIQUE nullable for 1:1 relationship with edge case support"
  - "Seed data: Dashboard user creation instead of pgcrypto (Supabase limitation)"

patterns-established:
  - "All tables: timestamptz with now() default, updated_at with trigger"
  - "JSONB permissions with GIN index for @> containment queries"
  - "Idempotent seeding: ON CONFLICT DO NOTHING on all inserts"
  - "Triggers use SECURITY DEFINER with SET search_path = public for security"

# Metrics
duration: ~45min
started: 2026-04-11T10:00:00Z
completed: 2026-04-11T10:45:00Z
---

# Phase 2 Plan 01: Core Schema Summary

**Normalized core user schema with profiles, roles, user_roles, and employees tables; secure triggers for auto-profile creation and timestamp management; realistic Vietnamese seed data.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~45 minutes |
| Started | 2026-04-11 |
| Completed | 2026-04-11 |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files modified | 4 created |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Core Tables Created | ✅ Pass | 4 tables: profiles, roles, user_roles, employees. No user data duplication in employees. |
| AC-2: Indexes Support Queries | ✅ Pass | GIN on roles.permissions, indexes on email, user_id, is_active, license_expiry |
| AC-3: Essential Triggers | ✅ Pass | handle_new_user() with SECURITY DEFINER + search_path, handle_updated_at() on 4 tables |
| AC-4: Realistic Seed Data | ✅ Pass | 9 Vietnamese users, 9 employees, 9 role assignments (via Dashboard user creation) |

## Accomplishments

- **Normalized schema design**: profiles as single source of truth for user data eliminates duplication across employees and future tables
- **Secure trigger implementation**: SECURITY DEFINER with SET search_path = public prevents search path injection attacks
- **Composite primary key**: user_roles uses (user_id, role_id) composite PK, eliminating redundant surrogate key
- **Flexible permissions system**: JSONB permissions with GIN index enables dynamic role management without schema changes
- **1:1 relationship with edge cases**: employees.user_id UNIQUE nullable allows PostgreSQL's multiple NULLs for non-linked records

## Task Commits

| Task | Status | Description |
|------|--------|-------------|
| Task 1: Core Schema | ✅ Done | Created 4 tables with proper FKs, indexes, constraints |
| Task 2: Triggers | ✅ Done | Created handle_updated_at() and handle_new_user() functions |
| Task 3: Seed Data | ✅ Done | Employee records and role assignments (after user creation) |
| Task 4: Checkpoint | ✅ Approved | User verified schema applied successfully |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `supabase/migrations/20260410120000_core_schema.sql` | Created | Core tables: profiles, roles, user_roles, employees; 6 default roles |
| `supabase/migrations/20260410120001_core_triggers.sql` | Created | Trigger functions: handle_updated_at(), handle_new_user() |
| `supabase/seed.sql` | Created | Employee records and role assignments (users created via Dashboard) |
| `supabase/README.md` | Created | Migration instructions and user creation guide |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **Dashboard user creation vs pgcrypto** | pgcrypto extension doesn't work reliably in Supabase Dashboard SQL Editor | Seed data requires manual user creation first, then employee/role seeding |
| **Composite PK on user_roles** | Eliminates redundant surrogate key, enforces uniqueness naturally | Simpler schema, fewer indexes, more explicit constraints |
| **employees.user_id UNIQUE nullable** | Enforces 1:1 relationship but allows multiple NULLs for edge cases | Supports employees without user accounts while preventing duplicates |
| **JSONB permissions with GIN index** | Enables dynamic permissions without schema changes; GIN optimizes @> queries | Roles can be modified without migrations, permission checks are fast |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Approach changes | 1 | Seed data methodology (documented) |

### Approach Changes

**1. Seed Data Creation Method**
- **Planned:** Direct auth.users insertion using pgcrypto extension
- **Actual:** Dashboard user creation + employee/role seeding
- **Reason:** pgcrypto extension has limitations in Supabase Dashboard SQL Editor (gen_salt() function not available across batches)
- **Impact:** Additional manual step for user creation, but more reliable and better documented
- **Files:** `supabase/seed.sql` updated with clear instructions, `supabase/README.md` updated

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| **pgcrypto gen_salt() not found** | Removed pgcrypto dependency, pivoted to Dashboard user creation approach |
| **Foreign key violation on employees** | Caused by missing profiles (auth.users not created); resolved by changing seeding approach |

## Next Phase Readiness

**Ready:**
- Core schema established and verified in Supabase
- Migration files ready for deployment
- Seed data pattern documented for development environments
- Foundation for all feature modules (vehicles, routes, employees, trips, bookings)

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 02-database-foundation, Plan: 01*
*Completed: 2026-04-11*
