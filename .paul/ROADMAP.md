# Roadmap: FleetGo System

## Overview

Build a comprehensive passenger coach fleet management system, progressing from foundation (auth, layout, shared UI), through database schema design, to core domain modules (vehicles, routes, employees, trips), customer-facing operations (ticketing, payments), and finally analytics. Each phase builds on the previous, delivering incremental value.

## Current Milestone

**v0.1 MVP** (v0.1.0)
Status: In progress (2 of 8 phases complete)
Phases: 2 of 8 complete, Phase 3 next

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation & Auth | 4 | ✅ Complete | 2026-04-10 |
| 2 | Database Foundation | 7 | ✅ Complete | 2026-04-14 |
| 3 | Vehicle Management | 3 | 🔵 In Progress | - |
| 4 | Route & Station Management | TBD | Not started | - |
| 5 | Employee & Role Management | TBD | Not started | - |
| 6 | Trip Scheduling | TBD | Not started | - |
| 7 | Customer, Ticketing & Payment | TBD | Not started | - |
| 8 | Dashboard & Analytics | TBD | Not started | - |

## Phase Details

### Phase 1: Foundation & Auth

**Goal:** Project scaffolding, FSD structure, shared UI, authentication, and app shell
**Depends on:** Nothing (first phase)
**Research:** Unlikely (established stack)

**Scope:**
- Vite + React 18 + TypeScript 5 project setup
- FSD v2.1 directory structure with path aliases
- Supabase client configuration
- Shared UI components (Shadcn/ui)
- Authentication system (login/logout, protected routes)
- App shell layout (sidebar, header, navigation)

**Plans:**
- [x] 01-01: Project Scaffolding & FSD Structure
- [x] 01-02: Shared UI Foundation
- [x] 01-03: Authentication System
- [x] 01-04: App Shell & Navigation

### Phase 2: Database Foundation

**Goal:** Complete database schema design, Supabase migrations, RLS policies, and triggers
**Depends on:** Phase 1 (foundation, Supabase client)
**Research:** Likely (Supabase migration patterns, trigger design)

**Scope:**
- Complete schema design for all entities (users, roles, vehicles, routes, stations, employees, trips, bookings, payments)
- Supabase migration files with proper indexes and constraints
- Row-Level Security (RLS) policies for all tables
- Database triggers for automated behaviors (timestamps, status transitions, cascade operations)
- Database functions for complex queries and business logic
- Validation rules and constraints at database level

**Plans:**
- [x] 02-01: Core Schema Design (users, roles, employees)
- [x] 02-02: Fleet Schema (vehicle_types, vehicles, maintenance_logs)
- [x] 02-03: Route Schema (stations, routes, route_stops)
- [x] 02-04: Trip Schema (trips, trip_staff)
- [x] 02-05: Booking Schema (customers, bookings, tickets, payments)
- [x] 02-06: RLS Policies & Security
- [x] 02-07: Triggers & Database Functions

### Phase 3: Vehicle Management

**Goal:** Fleet CRUD, vehicle types, seat layouts, maintenance logs
**Depends on:** Phase 1 (foundation, auth, shared UI), Phase 2 (database schema)
**Research:** Unlikely (CRUD operations)

**Scope:**
- To be defined during planning

**Plans:**
- [x] 03-01: Vehicle Types CRUD (entity layer + list page + form + delete)
- [ ] 03-02: Vehicles CRUD (entity + list + form + status management)
- [ ] 03-03: Maintenance Logs CRUD (entity + list + form + vehicle filter)

### Phase 4: Route & Station Management

**Goal:** Station CRUD, route definition, drag-and-drop intermediate stops
**Depends on:** Phase 1 (foundation), Phase 2 (database schema), Phase 3 (vehicle types for seat capacity reference)
**Research:** Likely (@dnd-kit integration)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 5: Employee & Role Management

**Goal:** Dynamic role CRUD, staff records, license expiry alerts
**Depends on:** Phase 1 (auth system, shared UI), Phase 2 (database schema)
**Research:** Unlikely (CRUD + Supabase RLS)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 6: Trip Scheduling

**Goal:** Trip creation, staff assignment with conflict validation, calendar view, driver schedule view
**Depends on:** Phase 2 (database schema), Phase 3 (vehicles), Phase 4 (routes), Phase 5 (employees)
**Research:** Likely (calendar component, conflict detection logic)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 7: Customer, Ticketing & Payment

**Goal:** Customer profiles, bookings, seat selection, payments
**Depends on:** Phase 2 (database schema), Phase 3 (seat layouts), Phase 6 (trips)
**Research:** Likely (seat selection UI, QR code generation)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 8: Dashboard & Analytics

**Goal:** Real-time statistics, fleet overview, booking overview, quick views
**Depends on:** All prior phases (aggregates data from all modules)
**Research:** Unlikely (charts + TanStack Query)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

---
*Roadmap created: 2026-04-10*
*Last updated: 2026-04-14 — Phase 3 plan 03-01 complete (Vehicle Types CRUD + visual seat editor)*
