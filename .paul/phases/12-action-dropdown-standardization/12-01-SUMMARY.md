---
phase: 12-action-dropdown-standardization
plan: 01
subsystem: ui
tags: [lucide-react, dropdown-menu, shadcn, icons, ux]

requires:
  - phase: 1-foundation-auth
    provides: Shared UI components including DropdownMenu, Button from @shared/ui
  - phase: all-feature-phases
    provides: 11 list pages (trips, vehicles, vehicle-types, stations, routes, roles, maintenance, employees, customers, bookings, payments)

provides:
  - Standardized action dropdown items across all 9 DropdownMenu-based list pages
  - Eye icon on inline "Xem" buttons on Bookings and Payments list pages

affects: [phase-13-toast-message-standardization]

tech-stack:
  added: []
  patterns:
    - Standard dropdown item pattern (Lucide icon + label, DropdownMenuSeparator before destructive action)
    - Consistent "Chỉnh sửa" edit label across all list pages

key-files:
  created: []
  modified:
    - src/pages/trips/ui/trips-page.tsx
    - src/pages/vehicles/ui/vehicles-page.tsx
    - src/pages/vehicle-types/ui/vehicle-types-page.tsx
    - src/pages/stations/ui/station-page.tsx
    - src/pages/routes/ui/routes-page.tsx
    - src/pages/roles/ui/roles-page.tsx
    - src/pages/maintenance/ui/maintenance-page.tsx
    - src/pages/employees/ui/employees-page.tsx
    - src/pages/customers/ui/customers-page.tsx
    - src/pages/bookings/ui/bookings-page.tsx
    - src/pages/payments/ui/payments-page.tsx

key-decisions:
  - "Standard dropdown order: contextual actions → Chỉnh sửa → separator → Xóa"
  - "Users icon on Phân công preserved (trips-page); MapPin on Điểm dừng (routes-page)"

patterns-established:
  - "Dropdown edit item: <Pencil className='mr-2 h-4 w-4' /> Chỉnh sửa"
  - "Dropdown delete item: <DropdownMenuSeparator /> then <Trash2 className='mr-2 h-4 w-4' /> Xóa with text-destructive focus:text-destructive"
  - "Inline view button: <Eye className='mr-2 h-4 w-4' /> Xem"

duration: ~30min
started: 2026-04-18T00:00:00Z
completed: 2026-04-18T00:00:00Z
---

# Phase 12 Plan 01: Action Dropdown Standardization Summary

**Standardized Lucide icons, consistent "Chỉnh sửa" labels, and DropdownMenuSeparator before "Xóa" across all 11 list pages — plus Eye icon on inline "Xem" buttons.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~30 min |
| Started | 2026-04-18 |
| Completed | 2026-04-18 |
| Tasks | 3 completed (2 auto + 1 checkpoint) |
| Files modified | 11 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Consistent Edit Label | Pass | All 9 dropdown pages use "Chỉnh sửa"; grep ">Sửa<" returns zero matches |
| AC-2: Icons on All Dropdown Items | Pass | Pencil on edit, Trash2 on delete, MapPin on Điểm dừng (routes), Users on Phân công (trips, preserved) |
| AC-3: Separator Before Destructive Action | Pass | DropdownMenuSeparator added before Xóa on all 9 dropdown pages |
| AC-4: Eye Icon on Inline View Buttons | Pass | Eye icon added to "Xem" button on Bookings and Payments pages |
| AC-5: No Regression in Functionality | Pass | Human-verify checkpoint approved; all onClick handlers untouched |

## Accomplishments

- All 9 dropdown pages now have a unified visual pattern: contextual actions → Pencil+Chỉnh sửa → separator → Trash2+Xóa
- Routes page: MapPin icon added to "Điểm dừng" action; Trips page: Users icon on "Phân công" preserved
- Bookings and Payments "Xem" button now has Eye icon for visual consistency
- `DropdownMenuSeparator` added to `@shared/ui` imports in all 9 dropdown files

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/pages/trips/ui/trips-page.tsx` | Modified | Add Pencil+Chỉnh sửa, separator, Trash2+Xóa; preserve Users+Phân công |
| `src/pages/vehicles/ui/vehicles-page.tsx` | Modified | Add Pencil icon, separator, Trash2 icon |
| `src/pages/vehicle-types/ui/vehicle-types-page.tsx` | Modified | Add Pencil icon, separator, Trash2 icon |
| `src/pages/stations/ui/station-page.tsx` | Modified | "Sửa"→"Chỉnh sửa" + Pencil, separator, Trash2 |
| `src/pages/routes/ui/routes-page.tsx` | Modified | "Sửa"→"Chỉnh sửa" + Pencil, MapPin+Điểm dừng, separator, Trash2 |
| `src/pages/roles/ui/roles-page.tsx` | Modified | "Sửa"→"Chỉnh sửa" + Pencil, separator, Trash2 |
| `src/pages/maintenance/ui/maintenance-page.tsx` | Modified | Add Pencil icon, separator, Trash2 icon |
| `src/pages/employees/ui/employees-page.tsx` | Modified | "Sửa"→"Chỉnh sửa" + Pencil, separator, Trash2 |
| `src/pages/customers/ui/customers-page.tsx` | Modified | "Sửa"→"Chỉnh sửa" + Pencil, separator, Trash2 |
| `src/pages/bookings/ui/bookings-page.tsx` | Modified | Add Eye icon to "Xem" button |
| `src/pages/payments/ui/payments-page.tsx` | Modified | Add Eye icon to "Xem" button |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Separator before Xóa only (not between all items) | Xóa is the only destructive action — separator serves as a visual warning | Consistent destructive action treatment across all pages |
| Preserve Users icon on Phân công (trips) and MapPin on Điểm dừng (routes) | These are existing page-specific icons that are semantically correct | No regression on contextual actions |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** None — plan executed exactly as written.

## Issues Encountered

None

## Skill Audit

All required skills invoked ✓
- /frontend-design ✓
- /feature-sliced-design ✓

## Next Phase Readiness

**Ready:**
- All list pages have consistent action dropdown patterns — Phase 13 (Toast Message Standardization) can begin on a clean foundation

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 12-action-dropdown-standardization, Plan: 01*
*Completed: 2026-04-18*
