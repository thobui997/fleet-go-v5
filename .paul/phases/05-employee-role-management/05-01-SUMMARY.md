---
phase: 05-employee-role-management
plan: 01
subsystem: ui
tags: [react, tanstack-query, supabase, zod, fsd]

requires:
  - phase: 04-route-station-management
    provides: FSD entity+page pattern (entity slice → queries → index), DataTable, form dialog conventions

provides:
  - "@entities/role public API: useRoles, useRole, useCreateRole, useUpdateRole, useDeleteRole"
  - "/roles CRUD page: paginated list + name search + create/edit dialog + permissions chip editor + delete dialog"

affects: 05-02-employees (role dropdown in employee form uses @entities/role)

tech-stack:
  added: []
  patterns:
    - "Permissions chip editor: plain string input + Enter/button add + × remove, backed by react-hook-form useWatch"
    - "mapRoleError: checks details?.includes('(name)') for 23505 disambiguation (MH from audit)"
    - "Dialog submit error displayed inline below footer buttons (not toast) — dialog stays open on error"

key-files:
  created:
    - src/entities/role/model/types.ts
    - src/entities/role/api/role.api.ts
    - src/entities/role/api/role.queries.ts
    - src/entities/role/index.ts
    - src/pages/roles/model/role-form-schema.ts
    - src/pages/roles/ui/roles-page.tsx
    - src/pages/roles/ui/role-form-dialog.tsx
    - src/pages/roles/ui/role-delete-dialog.tsx
    - src/pages/roles/index.ts
  modified:
    - src/entities/index.ts
    - src/pages/index.ts
    - src/app/lib/router.tsx

key-decisions:
  - "Permissions chip editor uses no external library — plain useState + useWatch + setValue per spec"
  - "mapRoleError checks details field (not raw message) for 23505 — more reliable disambiguation"

patterns-established:
  - "Chip editor pattern for JSONB array fields: permInput state + useWatch + setValue('permissions', [...])"
  - "Submit error as React state (setSubmitError) displayed below DialogFooter — toast reserved for success only"

duration: ~30min
started: 2026-04-15T00:00:00Z
completed: 2026-04-15T00:00:00Z
---

# Phase 5 Plan 01: Roles CRUD Summary

**Roles entity slice + CRUD page with permissions chip editor — `/roles` fully operational, `@entities/role` public API ready for employee form in 05-02.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Tasks | 2 completed |
| Checkpoints | 1 (human-verify — approved) |
| Files created | 10 |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Roles list page | Pass | Paginated DataTable, Name/Description/Permissions/Created At/Actions columns, debounced name search |
| AC-2: Create role | Pass | "Thêm vai trò" dialog, chip editor, toast "Tạo vai trò thành công" |
| AC-3: Edit role | Pass | Chips pre-fill from role.permissions, toast "Cập nhật vai trò thành công" |
| AC-4: Delete role | Pass | Cascade warning, toast "Xóa vai trò thành công" |
| AC-5: Permissions chip editor | Pass | Enter or "Thêm" to add, × to remove, serialized as JSONB array |
| AC-6: Error mapping (23505) | Pass | `roles_name_key` + `details.(name)` check, dialog stays open |

## Accomplishments

- `@entities/role` public API established — ready for 05-02 employee form role dropdown
- Permissions chip editor implemented without external library using `useWatch` + `setValue`
- Full error coverage: 23505 (duplicate name), 23514 (JSONB CHECK), PGRST301/401/403 (auth expiry)
- Dialog close guard during `isPending` prevents double-submit

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/entities/role/model/types.ts` | Created | Role, RoleInsert, RoleUpdate, RoleListParams interfaces |
| `src/entities/role/api/role.api.ts` | Created | Supabase CRUD — fetchRoles (paginated, ilike with trim), fetchRole, createRole, updateRole, deleteRole |
| `src/entities/role/api/role.queries.ts` | Created | TanStack Query hooks — useRoles, useRole, useCreateRole, useUpdateRole, useDeleteRole |
| `src/entities/role/index.ts` | Created | Public API barrel |
| `src/pages/roles/model/role-form-schema.ts` | Created | Zod schema + mapRoleError |
| `src/pages/roles/ui/roles-page.tsx` | Created | List page with DataTable, search, isError state |
| `src/pages/roles/ui/role-form-dialog.tsx` | Created | Create/edit dialog with chip editor |
| `src/pages/roles/ui/role-delete-dialog.tsx` | Created | Delete confirm dialog with cascade warning |
| `src/pages/roles/index.ts` | Created | Page barrel export |
| `src/entities/index.ts` | Modified | Added `export * from './role'` |
| `src/pages/index.ts` | Modified | Added RolesPage export |
| `src/app/lib/router.tsx` | Modified | ROUTES.ROLES → RolesPage (replaced PlaceholderPage) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Chip editor via useWatch + setValue | No external dep needed per MVP scope | Clean, no extra bundle weight |
| Submit error as React state below footer | Keeps dialog open on error per AC-6 | Toast reserved for success only |
| details?.includes('(name)') for 23505 | Audit MH-1: details field more reliable than message for constraint name | Correct duplicate-name detection |

## Deviations from Plan

None — implemented per spec exactly. All 6 audit fixes (1 MH + 5 SR) already incorporated into plan before APPLY.

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /frontend-design | ✓ | Loaded before task execution |
| /feature-sliced-design | ✓ | Loaded before task execution |

All required skills invoked ✓

## Next Phase Readiness

**Ready:**
- `@entities/role` public API available for 05-02 employee form role dropdown
- Pattern established: chip editor for array fields (reusable approach if needed)
- mapRoleError covers all error codes needed

**Concerns:**
- None

**Blockers:**
- None — 05-02 can proceed immediately

---
*Phase: 05-employee-role-management, Plan: 01*
*Completed: 2026-04-15*
