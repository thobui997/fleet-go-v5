# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-04-10)

**Core value:** Digitize and automate passenger coach fleet management into a single source of truth
**Current focus:** Phase 2 — Database Foundation (1 of 7 plans complete)

## Current Position

Milestone: v0.1 MVP
Phase: 2 of 8 (Database Foundation) — Execution
Plan: 02-04 executed, awaiting UNIFY
Status: APPLY complete, SUMMARY created
Last activity: 2026-04-11 — Executed 02-04 Trip Schema plan

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ○     [APPLY complete, ready for UNIFY]
```

Progress:
- Milestone: [██░░░░░░░░] 12.5%
- Phase 2: [█████░░░░] 57% (4 of 7 plans complete)

## Accumulated Context

### Decisions
- Supabase as BaaS — reduces backend dev time
- Feature-Sliced Design v2.1 — scalable architecture with clear boundaries
- Dynamic roles — flexible permission without code changes
- JSON seat layouts — supports diverse vehicle types
- TanStack Query — server-state caching, no global state store needed
- Phase 1 split into 4 plans: scaffolding, shared UI, auth, app shell
- 2026-04-10: **Added Phase 2 (Database Foundation)** — Inserted between Foundation & Auth and feature phases. Establishes complete schema design, migrations, RLS policies, and triggers before any feature development.
- 2026-04-10: Enterprise audit on 02-01-PLAN.md. Applied 1 must-have (UNIQUE employees.user_id for 1:1 enforcement), 3 strongly-recommended (CHECK roles.permissions JSONB array, UNIQUE employees.license_number, ON CONFLICT in handle_new_user trigger).
- 2026-04-11: Enterprise audit on 02-02-PLAN.md. Applied 3 strongly-recommended (CHECK seat_layout JSONB object type, explicit ON CONFLICT targets in seed, SELECT-based FK resolution instead of CTE RETURNING). Verdict: conditionally acceptable (now ready)
- 2026-04-11: Enterprise audit on 02-03-PLAN.md. Applied 1 must-have (latitude/longitude range CHECK on stations), 1 strongly-recommended (empty string CHECK on stations.name and routes.name). Verdict: conditionally acceptable (now ready)
- 2026-04-11: Enterprise audit on 02-04-PLAN.md. Applied 0 must-have, 3 strongly-recommended (composite index vehicle_id+departure_time, COMMENT ON INDEX for partial unique index, cleaned up Task 3 action). Verdict: conditionally acceptable (now ready)
- 2026-04-11: Plan 02-04 execution — Fixed ambiguous column reference in trip_staff seed inserts (`select id` → `select t.id`). Root cause: joining trips/routes/vehicles (all have `id` columns) required table qualifier.
- Normalized user schema — profiles as single source of truth eliminates duplication
- Composite PK on junction tables — eliminates redundant surrogate keys
- JSONB permissions with GIN index — dynamic permissions, fast @> queries
- Dashboard seed data approach — pgcrypto extension unreliable in Supabase Dashboard SQL Editor
- 2026-04-11: **Seed data approach pivot** — pgcrypto extension for direct auth.users insertion has limitations in Supabase Dashboard SQL Editor. Pivoted to Dashboard-based user creation (manual via Authentication → Users), then seeding employees/user_roles with actual UUIDs. More reliable and documented in seed.sql header.
- Feature-Sliced Design v2.1 — scalable architecture with clear boundaries
- Dynamic roles — flexible permission without code changes
- JSON seat layouts — supports diverse vehicle types
- TanStack Query — server-state caching, no global state store needed
- Phase 1 split into 4 plans: scaffolding, shared UI, auth, app shell
- 2026-04-10: **Added Phase 2 (Database Foundation)** — Inserted between Foundation & Auth and feature phases. Establishes complete schema design, migrations, RLS policies, and triggers before any feature development. This prevents rework from schema changes and ensures data model consistency across all dependent phases. All subsequent phases (3-8) renumbered accordingly.
- 2026-04-10: Enterprise audit on 02-01-PLAN.md. Applied 1 must-have (UNIQUE employees.user_id for 1:1 enforcement), 3 strongly-recommended (CHECK roles.permissions JSONB array, UNIQUE employees.license_number, ON CONFLICT in handle_new_user trigger). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-03-PLAN.md. Applied 2 must-have (auth error mapping to Vietnamese, session loading flash prevention), 3 strongly-recommended (subscription cleanup pattern, double-submit prevention, AuthContextValue type export). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-01-PLAN.md. Applied 2 must-have (dark mode CSS vars, env validation), 3 strongly-recommended (error boundary, ESLint config clarity, cn utility path). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-02-PLAN.md. Applied 2 must-have (DataTable ColumnDef interface, CSS variable overwrite protection), 3 strongly-recommended (Toaster wiring, dayjs import fix, schema verification). Verdict: conditionally acceptable (now ready)
- 2026-04-10: Enterprise audit on 01-04-PLAN.md. Applied 2 must-have (index.html in frontmatter, ROUTES constants for router paths), 4 strongly-recommended (NavLink ROUTES constants, logout error handling, body scroll lock, Escape key close). Verdict: conditionally acceptable (now ready)

### Deferred Issues
- ARIA accessibility attributes (sidebar, header, mobile overlay) — deferred from 01-04 audit, must address before public/regulated deployment
- Focus trapping in mobile sidebar overlay — keyboard accessibility gap, deferred from 01-04 audit

### Blockers/Concerns
None.

## Session Continuity

Last session: 2026-04-11
Stopped at: Loop 02-04 closed, committed, ready for next plan
Next action: Run /paul:plan to start plan 02-05 (RLS Policies)
Resume file: .paul/HANDOFF-2026-04-11.md
Git strategy: master (commits pushed locally, 13 ahead of origin)
Resume context:
- Phase 2 progress: 4 of 7 plans complete (57%)
- Completed: Core (02-01), Fleet (02-02), Route (02-03), Trip (02-04) schemas
- Latest commit: 64edee5 feat(02-04): trip schema
- Remaining: RLS Policies (02-05), Triggers (02-06), Validation (02-07)
- Trip schema: trips, trip_staff tables with 1-driver enforcement via partial unique index

---
*STATE.md — Updated after every significant action*
