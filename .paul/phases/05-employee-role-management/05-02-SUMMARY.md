---
phase: 05-employee-role-management
plan: 02
subsystem: ui
tags: [react, tanstack-query, supabase, zod, fsd, dayjs]

requires:
  - phase: 05-01-roles
    provides: "@entities/role public API (useRoles) consumed in employee form role dropdown"
  - phase: 04-route-station-management
    provides: FSD entity+page pattern, DataTable, form dialog conventions

provides:
  - "@entities/employee public API: useEmployees, useEmployee, useProfiles, useEmployeeRole, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, assignEmployeeRole"
  - "/employees CRUD page: paginated list + name search + is_active filter + license expiry alert badges"
  - "Employee form dialog: user/role dropdowns + date fields + split try/catch for partial-save safety"
  - "Employee delete dialog: with 23503 trip_staff FK error handling"

affects: 06-trip-scheduling (uses @entities/employee for staff assignment)

tech-stack:
  added: []
  patterns:
    - "profiles JOIN: !inner for search (filters rows), plain LEFT JOIN when no search (shows unlinked employees)"
    - "Split try/catch onSubmit: Step 1 = employee record, Step 2 = role assignment; partial-save shows warning toast"
    - "useEmployeeRole undefined guard: reset only fires when currentRole !== undefined (not just !== null)"
    - "Radix Select sentinel: '__none__' value instead of '' for null options (Radix reserves '' for placeholder)"
    - "License expiry badge: dayjs diff in days — <0 destructive, <=30 yellow, else null"
    - "Dual ColumnDef key fix: 'user_id' key for Full Name column, 'profiles' for Email — avoids duplicate React keys"

key-files:
  created:
    - src/entities/employee/model/types.ts
    - src/entities/employee/api/employee.api.ts
    - src/entities/employee/api/employee.queries.ts
    - src/entities/employee/index.ts
    - src/pages/employees/model/employee-form-schema.ts
    - src/pages/employees/ui/employees-page.tsx
    - src/pages/employees/ui/employee-form-dialog.tsx
    - src/pages/employees/ui/employee-delete-dialog.tsx
    - src/pages/employees/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "assignEmployeeRole exported from entity index — form dialog calls it directly without mutation hook (simpler for two-step save)"
  - "Profiles fetched via useProfiles (staleTime 5min) — no pagination for dropdown, limit 1000 with truncation warning"
  - "__none__ sentinel for Radix Select — empty string is reserved by Radix for placeholder mechanism"

patterns-established:
  - "Two-step form save with split try/catch: employee record first, role assignment second; partial save surfaces via warning toast"
  - "useEmployeeRole undefined guard: `currentRole !== undefined` before reset — prevents fast-submit race that silently removes role"
  - "License expiry badge helper: pure function getLicenseExpiryBadge(date) → ReactNode | null, placed at module level"

duration: ~60min
started: 2026-04-15T00:00:00Z
completed: 2026-04-15T00:00:00Z
---

# Phase 5 Plan 02: Employees CRUD Summary

**Employees entity slice with profiles JOIN + paginated CRUD page with license expiry alert badges (30-day/expired), user/role dropdown form, and delete dialog with trip-staff FK error — `/employees` fully operational, `@entities/employee` public API ready for Phase 6 trip staff assignment.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~60 min |
| Tasks | 2 auto + 1 checkpoint completed |
| Checkpoints | 1 (human-verify — approved) |
| Files created | 9 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Employees list page | Pass | Paginated DataTable, all 7 columns, debounced search (300ms), is_active filter |
| AC-2: License expiry alert badges | Pass | `daysLeft < 0` → "Hết hạn" (destructive), `daysLeft ≤ 30` → "Sắp hết hạn" (yellow), null/OK → no badge |
| AC-3: Create employee | Pass | User/role dropdowns, date fields, split save, success toast "Tạo nhân viên thành công" |
| AC-4: Edit employee | Pass | All fields pre-fill including role; `currentRole !== undefined` guard; role assignment updates user_roles |
| AC-5: Delete employee | Pass | Confirm dialog; 23503 mapped to trip-staff error; dialog stays open on error |
| AC-6: Error mapping | Pass | `.code` field used for SQLSTATE (not msg.includes); both 23505 variants + 23503 + PGRST301/401/403 covered |

## Accomplishments

- `@entities/employee` public API established with profiles JOIN, `fetchProfiles` for dropdown, `fetchEmployeeRole` for pre-fill, and `assignEmployeeRole` for user_roles management
- License expiry alert badges: 30-day "Sắp hết hạn" (yellow) and "Hết hạn" (destructive red) implemented with dayjs
- Split try/catch form submit prevents silent data loss — employee record saved even if role assignment fails
- `currentRole !== undefined` guard prevents race condition that would silently remove existing role on fast submit
- Full error coverage: two 23505 variants (license_number + user_id), 23503 (trip_staff FK), PGRST301/401/403 (auth expiry)

## Task Commits

| Task | Type | Description |
|------|------|-------------|
| Task 1: Employee entity slice | feat | @entities/employee with profiles JOIN, fetchProfiles, fetchEmployeeRole, assignEmployeeRole |
| Task 2: Employees page + router | feat | Employees CRUD page, form dialog, delete dialog, ROUTES.EMPLOYEES wired |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/employee/model/types.ts` | Created | Employee, EmployeeProfile, EmployeeInsert, EmployeeUpdate, EmployeeListParams |
| `src/entities/employee/api/employee.api.ts` | Created | Supabase CRUD — fetchEmployees (!inner vs LEFT JOIN for search), fetchProfiles, fetchEmployeeRole, assignEmployeeRole |
| `src/entities/employee/api/employee.queries.ts` | Created | TanStack Query hooks — useEmployees, useEmployee, useProfiles (staleTime 5min), useEmployeeRole, mutations |
| `src/entities/employee/index.ts` | Created | Public API barrel including assignEmployeeRole |
| `src/pages/employees/model/employee-form-schema.ts` | Created | Zod schema + mapEmployeeError (uses .code for SQLSTATE, not msg.includes) |
| `src/pages/employees/ui/employees-page.tsx` | Created | List page with getLicenseExpiryBadge, DataTable, search, is_active filter, isError state |
| `src/pages/employees/ui/employee-form-dialog.tsx` | Created | Create/edit dialog, split try/catch, currentRole undefined guard, __none__ Select sentinel |
| `src/pages/employees/ui/employee-delete-dialog.tsx` | Created | Delete confirm dialog, 23503 error shown inline |
| `src/pages/employees/index.ts` | Created | Page barrel export |
| `src/entities/index.ts` | Modified | Added `export * from './employee'` |
| `src/pages/index.ts` | Modified | Added EmployeesPage export |
| `src/app/lib/router.tsx` | Modified | ROUTES.EMPLOYEES → EmployeesPage (replaced PlaceholderPage) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `assignEmployeeRole` exported directly (not via mutation hook) | Two-step save needs direct call after employee mutateAsync resolves | Simplifies partial-save logic in form |
| `!inner` join only when search present | Without search, LEFT JOIN preserves unlinked employees in list | Correct AC-1 behavior |
| staleTime 5min on useProfiles | Profiles change infrequently; avoids refetch on every dialog open | Reduces API calls |
| `__none__` sentinel for Radix Select | Radix UI reserves `""` for placeholder/clear mechanism | Prevents "non-empty value" console error |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Essential fixes, no scope creep |

**Total impact:** Two auto-fixes discovered and resolved. Neither expanded scope.

### Auto-fixed Issues

**1. Radix UI Select empty value error**
- **Found during:** Checkpoint (human-verify)
- **Issue:** `<SelectItem value="">` throws console error — Radix UI reserves `""` for the placeholder mechanism
- **Fix:** Replaced `""` sentinel with `"__none__"` in both user and role dropdowns; `onValueChange` maps `"__none__"` → `null`
- **Files:** `src/pages/employees/ui/employee-form-dialog.tsx`
- **Verification:** Build passes; dialogs open without console errors

**2. Duplicate ColumnDef React key**
- **Found during:** Task 2 qualify (reading DataTable implementation)
- **Issue:** Two columns using `key: 'profiles'` would produce duplicate React keys in `<TableHead>` (DataTable uses `column.key` as React key)
- **Fix:** Changed Full Name column key from `'profiles'` to `'user_id'`; both still use `row.profiles` in the `cell` renderer
- **Files:** `src/pages/employees/ui/employees-page.tsx`
- **Verification:** Build passes; no duplicate key warnings

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /frontend-design | ✓ | Loaded before task execution |
| /feature-sliced-design | ✓ | Loaded before task execution |

All required skills invoked ✓

## Next Phase Readiness

**Ready:**
- `@entities/employee` public API fully available for Phase 6 trip staff assignment
- `assignEmployeeRole` pattern established for user_roles bridge table management
- License expiry badge logic in `getLicenseExpiryBadge` is self-contained and reusable

**Concerns:**
- `assignEmployeeRole` is non-atomic (DELETE then INSERT) — acceptable for MVP but worth noting for Phase 7+ audit trail requirements
- Profiles dropdown limited to 1000 records — truncation warning shown; full solution deferred

**Blockers:**
- None — Phase 6 can proceed

---
*Phase: 05-employee-role-management, Plan: 02*
*Completed: 2026-04-15*
