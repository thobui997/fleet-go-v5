# Roadmap: FleetGo System

## Overview

Build a comprehensive passenger coach fleet management system, progressing from foundation (auth, layout, shared UI) through core domain modules (vehicles, routes, employees, trips) to customer-facing operations (ticketing, payments) and finally analytics. Each phase builds on the previous, delivering incremental value.

## Current Milestone

**v0.1 MVP** (v0.1.0)
Status: In progress
Phases: 0 of 7 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation & Auth | 4 | Planning | - |
| 2 | Vehicle Management | TBD | Not started | - |
| 3 | Route & Station Management | TBD | Not started | - |
| 4 | Employee & Role Management | TBD | Not started | - |
| 5 | Trip Scheduling | TBD | Not started | - |
| 6 | Customer, Ticketing & Payment | TBD | Not started | - |
| 7 | Dashboard & Analytics | TBD | Not started | - |

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
- [ ] 01-01: Project Scaffolding & FSD Structure
- [ ] 01-02: Shared UI Foundation
- [ ] 01-03: Authentication System
- [ ] 01-04: App Shell & Navigation

### Phase 2: Vehicle Management

**Goal:** Fleet CRUD, vehicle types, seat layouts, maintenance logs
**Depends on:** Phase 1 (foundation, auth, shared UI)
**Research:** Unlikely (CRUD operations)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 3: Route & Station Management

**Goal:** Station CRUD, route definition, drag-and-drop intermediate stops
**Depends on:** Phase 2 (vehicle types for seat capacity)
**Research:** Likely (@dnd-kit integration)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 4: Employee & Role Management

**Goal:** Dynamic role CRUD, staff records, license expiry alerts
**Depends on:** Phase 1 (auth system, shared UI)
**Research:** Unlikely (CRUD + Supabase RLS)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 5: Trip Scheduling

**Goal:** Trip creation, staff assignment with conflict validation, calendar view, driver schedule view
**Depends on:** Phase 2 (vehicles), Phase 3 (routes), Phase 4 (employees)
**Research:** Likely (calendar component, conflict detection logic)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 6: Customer, Ticketing & Payment

**Goal:** Customer profiles, bookings, seat selection, payments
**Depends on:** Phase 2 (seat layouts), Phase 5 (trips)
**Research:** Likely (seat selection UI, QR code generation)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

### Phase 7: Dashboard & Analytics

**Goal:** Real-time statistics, fleet overview, booking overview, quick views
**Depends on:** All prior phases (aggregates data from all modules)
**Research:** Unlikely (charts + TanStack Query)

**Scope:**
- To be defined during planning

**Plans:**
- [ ] TBD

---
*Roadmap created: 2026-04-10*
