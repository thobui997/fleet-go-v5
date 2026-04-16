---
phase: 07-customer-ticketing-payment
plan: 01
subsystem: crud
tags: customer, entity-slice, tanstack-query, supabase, fsd, vietnamese-i18n

# Dependency graph
requires:
  - phase: 02-database-foundation
    provides: customers table with UNIQUE constraints (phone_number, email, id_card_number), FK to bookings
  - phase: 06-trip-scheduling
    provides: established FSD entity slice pattern (station, trip, vehicle)
provides:
  - customer entity slice (types, API, hooks)
  - customer CRUD UI (list page, form dialog, delete confirmation)
  - router integration for /customers route
affects: 07-02-booking-management (bookings reference customers)

# Tech tracking
tech-stack:
  added: []
  patterns: entity-slice-with-queries, hasInitializedRef-edit-pattern, mapSupabaseError-vietnamese

key-files:
  created: src/entities/customer/model/types.ts, src/entities/customer/api/customer.api.ts, src/entities/customer/api/customer.queries.ts, src/pages/customers/model/customer-form-schema.ts, src/pages/customers/ui/customers-page.tsx, src/pages/customers/ui/customer-form-dialog.tsx, src/pages/customers/ui/customer-delete-dialog.tsx
  modified: src/app/lib/router.tsx

key-decisions:
  - "serializeToInsert: loyalty_points defaulted to 0 (server default) to satisfy CustomerInsert type"
  - "Gender Select uses DB values directly ('male'/'female'/'other') with Radix __none__ sentinel for nullable"

patterns-established:
  - "Customer entity follows station entity pattern exactly (types → api → queries → index)"
  - "Vietnamese error mapping with constraint-specific 23505 messages"
  - "phone_number trim in serializeToInsert prevents UNIQUE bypass"
  - "Empty string → null coercion for UNIQUE nullable columns (email, id_card_number)"

# Metrics
duration: 15min
started: 2026-04-16T14:30:00Z
completed: 2026-04-16T14:45:00Z
---

# Phase 7 Plan 01: Customer CRUD Summary

**Customer entity slice with TanStack Query hooks, Vietnamese error handling, UNIQUE constraint validation, and CRUD UI replacing placeholder route.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 15min |
| Started | 2026-04-16T14:30:00Z |
| Completed | 2026-04-16T14:45:00Z |
| Tasks | 3 completed |
| Files modified | 11 (8 created, 1 modified) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Customer List Page | Pass | Paginated table with columns: Họ tên, Số ĐT, Email, CMND/CCCD, Giới tính, Ngày tạo; search with 300ms debounce; ordered by full_name |
| AC-2: List Error State | Pass | AlertCircle icon + mapSupabaseError (401/403/PGRST301 auth expiry) + retry button |
| AC-3: Create Customer | Pass | Form dialog with required full_name, phone_number; optional email, date_of_birth, gender, id_card_number, address, notes; success toast |
| AC-4: Edit Customer | Pass | hasInitializedRef pattern prevents background refetch overwrite; useEffect reset on customer change; success toast |
| AC-5: Delete Customer | Pass | Delete confirmation dialog; 23503 FK error → "Không thể xóa khách hàng đã có đặt vé" |
| AC-6: Validation Errors | Pass | Vietnamese Zod messages; phone regex: `/^(0\d{9,10})$/`; future date guard on date_of_birth |
| AC-7: Duplicate Constraint Errors | Pass | 23505 constraint-specific mapping: phone/email/id_card_number each have unique Vietnamese messages |
| AC-8: Router Integration | Pass | ROUTES.CUSTOMERS serves CustomersPage (not PlaceholderPage); import added; other routes unchanged |

## Accomplishments

- **Customer entity slice**: Full CRUD API with Supabase, TanStack Query hooks (useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer), search with `.or()` on full_name/phone_number/email
- **Vietnamese error handling**: Auth expiry (401/403/PGRST301), 23503 FK ("Không thể xóa khách hàng đã có đặt vé"), 23505 constraint-specific (phone/email/id_card_number), 23514 CHECK, generic fallback
- **Data integrity safeguards**: phone_number trimmed (UNIQUE bypass prevention), email/id_card_number empty→null (UNIQUE nullable coercion), id_card_number trimmed
- **CRUD UI**: List page with DataTable, search, pagination; form dialog with hasInitializedRef pattern; delete confirmation dialog

## Task Commits

Tasks completed atomically within single session:

| Task | Status | Description |
|------|--------|-------------|
| Task 1: Customer Entity Slice | ✓ | Created types.ts, customer.api.ts, customer.queries.ts, index.ts following station pattern |
| Task 2: Customer Page Layer | ✓ | Created customer-form-schema.ts, customers-page.tsx, customer-form-dialog.tsx, customer-delete-dialog.tsx, index.ts |
| Task 3: Router Integration | ✓ | Added CustomersPage import, replaced ROUTES.CUSTOMERS placeholder |

Plan metadata: 07-01-PLAN.md (Customer CRUD)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/customer/model/types.ts` | Created | Customer interface, CustomerInsert, CustomerUpdate, CustomerListParams |
| `src/entities/customer/api/customer.api.ts` | Created | fetchCustomers (with search .or()), fetchCustomer, createCustomer, updateCustomer, deleteCustomer |
| `src/entities/customer/api/customer.queries.ts` | Created | TanStack Query hooks with ['customers'] cache invalidation |
| `src/entities/customer/index.ts` | Created | Public API exports for entity slice |
| `src/pages/customers/model/customer-form-schema.ts` | Created | Zod schema with Vietnamese messages; mapSupabaseError; serializeToInsert with critical trim/null coercion |
| `src/pages/customers/ui/customers-page.tsx` | Created | List page with DataTable, search (300ms), pagination, error state with retry |
| `src/pages/customers/ui/customer-form-dialog.tsx` | Created | Form dialog with hasInitializedRef, all fields, Radix Select __none__ for gender |
| `src/pages/customers/ui/customer-delete-dialog.tsx` | Created | Delete confirmation with Vietnamese error toast |
| `src/pages/customers/index.ts` | Created | Public API export: CustomersPage |
| `src/app/lib/router.tsx` | Modified | Added CustomersPage import, replaced ROUTES.CUSTOMERS placeholder |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| loyalty_points: 0 in serializeToInsert | CustomerInsert type requires loyalty_points, but field is read-only in this phase (deferred UI) | Server default applies; type satisfied without changing interface |
| Gender Select uses DB values directly ('male'/'female'/'other') | Plan specified DB values in Select, no label→value mapping needed in serializeToInsert | Simplified serialization; passes through or null for empty |
| hasInitializedRef pattern for edit mode | Prevents background refetch from overwriting form fields during user editing | Follows station-form-dialog pattern exactly |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential fix for TypeScript compilation |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** Single auto-fix to satisfy CustomerInsert type requirement.

### Auto-fixed Issues

**1. TypeScript Compilation — Missing loyalty_points**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** `serializeToInsert` returned object missing `loyalty_points` property required by `CustomerInsert` type
- **Fix:** Added `loyalty_points: 0` to serializeToInsert return value (server default)
- **Files:** `src/pages/customers/model/customer-form-schema.ts`
- **Verification:** npm run build passed with zero errors
- **Note:** Plan specified loyalty_points as "read-only, no UI in this phase" but CustomerInsert type (derived from Omit<Customer, 'id' | 'created_at' | 'updated_at'>) includes it

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Initial TypeScript compilation error (loyalty_points missing) | Added loyalty_points: 0 to serializeToInsert; build passed |

## Next Phase Readiness

**Ready:**
- Customer entity slice with full CRUD API and TanStack Query hooks
- Customer CRUD UI (list, create, edit, delete) with Vietnamese error handling
- Router integration at /customers route
- Pattern established for remaining Phase 7 entities (booking, payment)

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 07-customer-ticketing-payment, Plan: 01*
*Completed: 2026-04-16*
