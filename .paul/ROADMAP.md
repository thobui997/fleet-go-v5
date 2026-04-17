# Roadmap: FleetGo System

## Overview

Build a comprehensive passenger coach fleet management system, progressing from foundation (auth, layout, shared UI), through database schema design, to core domain modules (vehicles, routes, employees, trips), customer-facing operations (ticketing, payments), and finally analytics. Each phase builds on the previous, delivering incremental value.

## Current Milestone

**v0.1.2 UI Polish**
Status: 🚧 In Progress
Phases: 1 of 2 complete

## Past Milestones

**v0.1 MVP** (v0.1.0)
Status: ✅ **COMPLETE** (8 of 8 phases complete)

**Post-MVP: UX Improvements** (v0.1.1)
Status: ✅ **COMPLETE** (2026-04-17) — 3 of 3 phases complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Foundation & Auth | 4 | ✅ Complete | 2026-04-10 |
| 2 | Database Foundation | 7 | ✅ Complete | 2026-04-14 |
| 3 | Vehicle Management | 3 | ✅ Complete | 2026-04-14 |
| 4 | Route & Station Management | 3 | ✅ Complete | 2026-04-15 |
| 5 | Employee & Role Management | 2 | ✅ Complete | 2026-04-15 |
| 6 | Trip Scheduling | 3 | ✅ Complete | 2026-04-16 |
| 7 | Customer, Ticketing & Payment | 4 | ✅ Complete | 2026-04-16 |
| 8 | Dashboard & Analytics | 2 | ✅ Complete | 2026-04-17 |
| 9 | Layout Refactor | 2 | ✅ Complete | 2026-04-17 |
| 10 | Form UX Redesign | 6 | ✅ Complete | 2026-04-17 |
| 11 | Date Input Migration | 3 | ✅ Complete | 2026-04-17 |
| 12 | Action Dropdown Standardization | 1 | ✅ Complete | 2026-04-18 |
| 13 | Toast Message Standardization | TBD | Not started | - |

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
- [x] 03-02: Vehicles CRUD (entity + list + form + status management)
- [x] 03-03: Maintenance Logs CRUD (entity + list + form + vehicle/type filter)

### Phase 4: Route & Station Management

**Goal:** Station CRUD, route definition, drag-and-drop intermediate stops
**Depends on:** Phase 1 (foundation), Phase 2 (database schema), Phase 3 (vehicle types for seat capacity reference)
**Research:** Likely (@dnd-kit integration)

**Scope:**
- To be defined during planning

**Plans:**
- [x] 04-01: Stations CRUD (entity slice + list + form + delete + router)
- [x] 04-02: Routes CRUD (depends on @entities/station for FK dropdowns)
- [x] 04-03: Route Stops Editor (drag-and-drop with @dnd-kit)

### Phase 5: Employee & Role Management

**Goal:** Dynamic role CRUD, staff records, license expiry alerts
**Depends on:** Phase 1 (auth system, shared UI), Phase 2 (database schema)
**Research:** Unlikely (CRUD + Supabase RLS)

**Scope:**
- To be defined during planning

**Plans:**
- [x] 05-01: Roles CRUD (entity slice + list + permissions chip editor + delete)
- [x] 05-02: Employees CRUD (entity slice + profiles JOIN + license expiry alerts + role assignment)

### Phase 6: Trip Scheduling

**Goal:** Trip creation, staff assignment with conflict validation, calendar view, driver schedule view
**Depends on:** Phase 2 (database schema), Phase 3 (vehicles), Phase 4 (routes), Phase 5 (employees)
**Research:** Likely (calendar component, conflict detection logic)

**Scope:**
- To be defined during planning

**Plans:**
- [x] 06-01: Trip CRUD (entity slice + list page + form dialog + delete + router)
- [x] 06-02: Staff Assignment & Conflict Validation (depends on 06-01)
- [x] 06-03: Calendar View + My Schedule (depends on 06-01)

### Phase 7: Customer, Ticketing & Payment

**Goal:** Customer profiles, bookings, seat selection, payments
**Depends on:** Phase 2 (database schema), Phase 3 (seat layouts), Phase 6 (trips)
**Research:** Likely (seat selection UI, QR code generation)

**Scope:**
- Customer management (CRUD, search, profiles)
- Booking management (list, detail, creation, cancellation with payment sync)
- Seat map visualization (visual layout showing booked/available seats)
- QR code generation and scanning for ticket check-in
- Ticket status lifecycle (issued → checked-in / cancelled / no-show)
- Payment management (standalone list page, status updates, refund tracking)

**Plans:**
- [x] 07-01: Customer CRUD (entity slice + list page + form dialog + router)
- [x] 07-02: Booking Management (entity + list + detail + creation + cancellation + payment sync)
- [x] 07-03: Seat Map, QR & Ticket Operations (visual seat map + QR gen/scan + ticket lifecycle)
- [x] 07-04: Payment Management (standalone payment list + filters + status updates + refund tracking)

### Phase 8: Dashboard & Analytics

**Goal:** Real-time statistics, fleet overview, booking overview, quick views
**Depends on:** All prior phases (aggregates data from all modules)
**Research:** Unlikely (charts + TanStack Query)

**Scope:**
- To be defined during planning

**Plans:**
- [x] 08-01: Dashboard Page — Stats & Quick Views (stat cards, recent bookings, upcoming trips)
- [x] 08-02: Charts & Analytics (revenue trend, trip status donut, booking status bar)

### Phase 9: Layout Refactor

**Goal:** Viewport-constrained layout for all list pages — table body scrolls, chrome stays fixed
**Depends on:** Phase 1 (AppLayout, DataTable, all list pages)
**Research:** Not needed (approach defined in CONTEXT.md)

**Scope:**
- AppLayout: `h-screen overflow-hidden`, `<main>` is `flex-1 overflow-hidden`
- DataTable: sticky header, `overflow-auto flex-1 min-h-[200px]`, `flex flex-col h-full`
- 11 list pages: `flex flex-col h-full` / `flex-none` / `flex-1 min-h-0` pattern
- 4 non-list pages: `h-full overflow-y-auto` opt-in scroll

**Plans:**
- [x] 09-01: AppLayout + DataTable foundation (2 files, autonomous, wave 1)
- [x] 09-02: Page adoption — 11 list pages + 4 non-list pages (15 files, human-verify, wave 2)

### Phase 10: Form UX Redesign

**Goal:** Redesign all 9 form dialogs — fix focus clipping, add field grouping with sections, move complex forms to dedicated full pages, optimize dialog layouts with multi-column grids
**Depends on:** Phase 1 (shared UI), all feature phases (forms live across all modules)
**Research:** Not needed (approach defined in CONTEXT.md)

**Scope:**
- Shared `FormSection` component in `@shared/ui`
- Focus fix applied to all 5 dialogs that remain
- Dialog layout improvements: 2-column grids for Vehicles, Customers, Stations
- 4 forms moved to full pages: Maintenance, Trips, Employees, Routes
- Dirty state guard (`useBlocker`) on all form pages
- Fetch-by-ID hooks for all 4 entities
- Router updates + list page updates for all 4 moved forms
- Sub-page integration: Route Stops + Trip Staff linked from form pages

**Plans:**
- [x] 10-01: Shared foundation — FormSection component + focus fix + dialog layout improvements
- [x] 10-02: Maintenance form page
- [x] 10-03: Trip form page + StaffAssignmentPage
- [x] 10-04: Employee form page
- [x] 10-05: Route form page + RouteStopsPage
- [x] 10-06: Booking form page

### Phase 11: Date Input Migration

**Goal:** Replace all native `input type="date"` fields with Shadcn DatePicker/DateRangePicker components
**Depends on:** Phase 1 (shared UI), Phase 10 (Form UX Redesign complete)
**Research:** Unlikely (Shadcn DatePicker component available)

**Scope:**
- Audit all forms and pages for native date inputs
- Install/configure Shadcn DatePicker component
- Create shared DatePicker wrapper for React Hook Form integration
- Replace date fields in all forms (Maintenance, Trip, Booking, Payment, Employee, Customer)
- Replace date range filters in list pages (Dashboard, Trips, Bookings, Payments)
- Ensure Vietnamese locale support (dayjs already configured)
- Maintain existing validation and error handling

**Plans:**
- [x] 11-01: DatePicker component setup + shared wrapper
- [x] 11-02: Form migration — replace date inputs in all 6 forms
- [x] 11-03: List page filter migration — replace date range inputs

### Phase 12: Action Dropdown Standardization

Focus: Standardize action dropdown items across all list pages — consistent labels, ordering, and icons for all actions (View, Edit, Delete, etc.)
Plans: 1/1 complete
Status: ✅ Complete (2026-04-18)

**Plans:**
- [x] 12-01: Action Dropdown Standardization — all 11 list pages (icons, labels, separators)

### Phase 13: Toast Message Standardization

Focus: Standardize toast messages across the app — consistent titles, descriptions, colors, layout, and icons for success/error/warning states
Plans: 2 plans (13-01: dialogs, 13-02: pages)
Status: Planning (2026-04-18)

---
*Roadmap created: 2026-04-10*
*Last updated: 2026-04-18 — Milestone v0.1.2 UI Polish created: Phase 12 (Action Dropdown Standardization) + Phase 13 (Toast Message Standardization).*
