# FleetGo System

## What This Is

A comprehensive, cloud-based passenger coach fleet and transportation management system built with React and Supabase. It streamlines back-office operations including vehicle tracking, route planning, trip scheduling, employee management, dynamic role-based access, and ticket booking for passenger transit logistics companies.

## Core Value

Digitize and automate the manual, fragmented processes of managing a passenger coach transportation company — centralize operations into a single source of truth, eliminate scheduling conflicts, optimize vehicle maintenance, and provide real-time financial and operational analytics.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.1.0 |
| Status | In Development |
| Last Updated | 2026-04-16 |

## Requirements

### Core Features

- **Dashboard & Analytics:** Real-time statistics (revenue, fleet status, trip status, booking overview), quick views for recent bookings and upcoming trips
- **Vehicle Management:** Fleet CRUD, maintenance logs, vehicle types & seat layout configuration (JSON-based visual seat maps)
- **Route & Station Management:** Station CRUD, route definition with origin/destination/distance/duration/base price, drag-and-drop intermediate stops
- **Employee & Role Management:** Dynamic role CRUD, staff records with role assignment, license expiry alerts (30-day warning)
- **Trip Scheduling:** Trip creation with route/vehicle/time assignment, staff assignment with conflict validation (max 1 driver per trip, no overlapping schedules), calendar view, driver/assistant personal schedule view
- **Customer & Ticketing:** Customer profiles with loyalty points, bookings with auto-generated codes (BKG-XXXXX), seat selection with double-booking prevention, optional QR codes
- **Payment Management:** Transaction tracking linked to bookings, multiple payment methods (Cash/E-wallet/Bank Transfer), payment-booking status sync

### Validated (Shipped)

- **Infrastructure & Tooling:** React 18.x, TypeScript 5.x, Vite 5.x, ESLint, Prettier — Phase 1
- **Architecture:** Feature-Sliced Design v2.1 with strict layer boundaries, public API exports — Phase 1
- **Routing:** React Router 6.x with protected routes and outlet-based layouts — Phase 1
- **State Management:** TanStack Query 5.x for server-state caching — Phase 1
- **Styling:** TailwindCSS 3.x + Shadcn/ui component library with dark mode support — Phase 1
- **Authentication:** Supabase GoTrue JWT auth with session management, login page, protected routes — Phase 1
- **UI Foundation:** App shell layout with responsive sidebar navigation (desktop collapsible, mobile overlay), header with user context and actions — Phase 1
- **Database Foundation — 16-table schema:** profiles, roles, user_roles, employees, vehicle_types, vehicles, maintenance_logs, stations, routes, route_stops, trips, trip_staff, trip_status_log, customers, bookings, tickets, payments — Phase 2
- **Database Foundation — RLS:** Row-level security policies for all 16 tables; REVOKE/GRANT on helper functions; has_permission() + is_admin() helpers — Phase 2
- **Database Foundation — Integrity:** Audit-column immutability triggers (FG001/FG002/FG003) + booking status FSM (FG004); BEFORE UPDATE with IS DISTINCT FROM; distinct SQLSTATE per violation class — Phase 2
- **Vehicle Management:** Vehicle Types CRUD with JSON seat layout configurator; Vehicles CRUD with status management, FK dropdown, debounced search; Maintenance Logs CRUD with vehicle/type filters, cost tracking, date cross-field validation — Phase 3
- **Route & Station Management:** Station CRUD (name/city/lat-lng/is_active); Route CRUD with FK dropdowns and duration parsing; Route Stops Editor with @dnd-kit drag-and-drop reorder, bulk-replace save (DELETE then INSERT) — Phase 4
- **Employee & Role Management:** Dynamic Role CRUD with permissions chip editor (JSONB array); Employee CRUD with profiles JOIN, license expiry alert badges (30-day/expired), user dropdown, role assignment via user_roles — Phase 5
- **Trip Scheduling:** Trip CRUD with route/vehicle/time assignment; Staff assignment with conflict validation (max 1 driver per trip, no overlapping schedules); Trip Calendar page (monthly grid view with dayjs, Vietnamese headers); My Schedule page (employee assigned trips with upcoming/past split) — Phase 6
- **Customer & Ticketing:** Customer CRUD with search and phone validation; Booking CRUD with seat map, auto-generated codes (BKG-XXXXX), ticket creation, cancellation with payment status sync; Check-in page with QR scanning and context-aware error mapping; Seat Map component with multi-floor support and runtime validation; QR code generation (deterministic: booking_code-seat_number) — Phase 7
- **Payment Management:** Payment entity slice (types, API, queries); Payment list page with filters (status, method, date range, search); Status update workflows (pending→completed/failed with paid_at logic; completed→refunded with notes); Booking detail payment integration (method, status, amount, dates, transaction reference); processed_by audit trail for cash handling — Phase 7

### Active (In Progress)

- None — all phases through Phase 7 complete

### Planned (Next)

- Phase 8: Dashboard & Analytics — Real-time statistics, quick views, operational insights

### Out of Scope

- Customer-facing mobile application or website for self-booking
- Live GPS hardware tracking of passenger coaches on a map
- Complex payroll and HR tax calculations

## Target Users

**Primary:** Back-office administrative staff
- System Administrator: Full access, system settings, role management
- Fleet Manager: Vehicle management module
- Dispatcher/Scheduler: Routes, stations, employees, trip planning
- Ticketing Agent: Ticketing, booking, payment processing

**Secondary:** On-the-ground operational staff
- Driver: View assigned trips, vehicle details, route schedules (read-only)
- Assistant Driver: View assigned trips, passenger manifests, ticket verification

## Context

**Business Context:** Transportation companies currently rely on spreadsheets, paper tickets, and disjointed communication (Zalo/WhatsApp). High frequency of scheduling conflicts, lack of vehicle health visibility, manual ticketing causing revenue leakage, difficulty tracking profitability and fleet utilization.

**Technical Context:** Serverless/BaaS monolith architecture. SPA frontend with Feature-Sliced Design v2.1. Supabase for backend (PostgreSQL, GoTrue auth, PostgREST APIs). JWT auth with dynamic RBAC via Supabase RLS policies.

## Constraints

### Technical Constraints

- Node 18.x, React 18.x, TypeScript 5.x, Vite 5.x
- Strict Feature-Sliced Design v2.1 architecture (no cross-imports, public API only, one-way data flow)
- Supabase as sole backend (PostgreSQL, GoTrue, PostgREST)
- Client-side caching via TanStack Query 5.x
- Page loads under 1.5 seconds
- Pagination for all list views (10/20/50/100)
- 99.9% uptime target

### Business Constraints

- Web-based admin/staff portal only (no customer-facing app)
- Role-Based Access Control via dynamic roles (not hardcoded)
- Seat layout configuration must support multi-deck vehicles (sleeper coaches, limousines)

### Compliance Constraints

- JWT-based authentication required
- Supabase RLS policies for data access control

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Supabase as BaaS | Auto-generated APIs, built-in auth, PostgreSQL, reduces backend dev time | 2026-04-10 | Active |
| Feature-Sliced Design v2.1 | Scalable architecture with clear module boundaries, one-way data flow | 2026-04-10 | Active |
| Dynamic roles (not hardcoded) | Flexible permission assignments without code changes | 2026-04-10 | Active |
| JSON-based seat layouts | Supports diverse vehicle types (sleeper, limousine) with upper/lower decks | 2026-04-10 | Active |
| TanStack Query for state | Server-state management with caching, eliminates need for global state store | 2026-04-10 | Active |
| Normalized user schema | profiles as single source of truth eliminates duplication across tables | 2026-04-11 | Active |
| Composite PK on junction tables | Eliminates redundant surrogate keys, enforces uniqueness naturally | 2026-04-11 | Active |
| JSONB permissions with GIN index | Dynamic permissions without schema changes, fast @> queries | 2026-04-11 | Active |
| Dashboard user creation for seed | pgcrypto extension unreliable in Supabase Dashboard SQL Editor | 2026-04-11 | Active |
| Composite FK tickets(booking_id, trip_id) → bookings | Prevents trip-drift: ticket must belong to same trip as its booking | 2026-04-14 | Active |
| Distinct SQLSTATE per violation class (FG001-FG004) | Machine-classifiable by clients without parsing message strings | 2026-04-14 | Active |
| BEFORE UPDATE triggers + IS DISTINCT FROM | Cheaper than AFTER + rollback; NULL-aware comparison rejects NULL-ing a set column | 2026-04-14 | Active |
| RLS controls who, triggers control what | Orthogonal layers: RLS governs row access, triggers govern field mutation | 2026-04-14 | Active |
| route_stops composite PK → dndId as "route_id:station_id" | No surrogate id column; composite string is stable and unique per stop within a session | 2026-04-15 | Active |
| Route stops save: non-atomic DELETE + INSERT | MVP acceptable; partial failure surfaces as error user can retry; full atomicity deferred to Phase 7+ | 2026-04-15 | Active |
| hasInitializedRef pattern for dialog local state | Prevents TanStack Query background refetch from overwriting unsaved edits after first load | 2026-04-15 | Active |
| Two-step employee save: employee record then role assignment | Role assignment (user_roles) is separate from employee record; split try/catch surfaces partial failures | 2026-04-15 | Active |
| Radix Select __none__ sentinel | Radix UI reserves empty string for placeholder; sentinel maps back to null in onValueChange | 2026-04-15 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Page load time | < 1.5 seconds | - | Not started |
| Scheduling conflicts | Zero | - | Not started |
| Double-booking incidents | Zero | - | Not started |
| Fleet visibility | Real-time status for all vehicles | - | Not started |
| Revenue tracking accuracy | Real-time dashboard | - | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | React 18.x | SPA |
| Language | TypeScript 5.x | Strict typing |
| Build Tool | Vite 5.x | Fast dev/build |
| Architecture | Feature-Sliced Design v2.1 | Strict layer boundaries |
| Routing | React Router 6.x | Client-side routing |
| State Management | TanStack Query 5.x | Server-state caching |
| Forms | React Hook Form + Zod | Validation |
| Styling | TailwindCSS 3.x + Shadcn/ui | Utility-first + component library |
| Drag & Drop | @dnd-kit | Route stops ordering |
| Dates | Day.js | Lightweight date handling |
| Backend/DB/Auth | Supabase (PostgreSQL) | BaaS monolith |
| Linting | ESLint | Code quality |
| Formatting | Prettier | Code style |

## Data Model (Core Relationships)

- `Roles` (1:N) → `Users` (Dynamic role management)
- `Users` (UUID, Auth) ↔ `Employees` (1:1)
- `VehicleTypes` (1:1) → `SeatLayouts` (JSON seat map)
- `VehicleTypes` (1:N) → `Vehicles`
- `Vehicles` (1:N) → `MaintenanceLogs`
- `Stations` (1:N) → `RouteStops` ← (N:1) `Routes`
- `Routes` (1:N) → `Trips`
- `Vehicles` (1:N) → `Trips`
- `Trips` (1:N) → `TripStaff` ← (N:1) `Employees` (Join Table)
- `Customers` (1:N) → `Bookings`
- `Trips` (1:N) → `Bookings`
- `Bookings` (1:N) → `Tickets`
- `Bookings` (1:1) → `Payments`

## Specialized Flows

See: .paul/SPECIAL-FLOWS.md

Quick Reference:
- /frontend-design → UI components, page layouts, forms, dashboards, responsive design
- /feature-sliced-design → Code organization, FSD architecture, layer boundaries

## Links

| Resource | URL |
|----------|-----|
| Repository | (To be configured) |

---
*Last updated: 2026-04-16 after Phase 7 complete*
