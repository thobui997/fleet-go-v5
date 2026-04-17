# Phase 10 — Form UX Redesign: Context

## Phase Summary

Redesign all 9 form dialogs to improve usability and visual consistency.
Three interrelated concerns: fix focus clipping, add field grouping via
sections, and move complex forms off dialogs onto dedicated full pages.

---

## Goals

1. **Fix focus state clipping** — input focus rings (border/outline/shadow)
   are clipped by `overflow: hidden` on dialog containers. Fix for all dialogs.

2. **Group related fields into sections** — labeled sections with subtle
   dividers (e.g., "Thông tin cơ bản", "Thông tin kỹ thuật"). Use a shared
   `FormSection` component in `@shared/ui` so all forms render consistently.

3. **Move complex forms to dedicated pages** — 4 forms move to full pages
   (Maintenance, Trips, Employees, Routes). 5 remain as dialogs with
   improved multi-column layout and sections.

4. **Optimize dialog layout** — dialogs that stay should not be single-column
   vertical stacks. Use 2-column grid layouts where field groups allow.

5. **Dirty state guard** — full-page forms must block accidental navigation
   away with unsaved changes (React Router `useBlocker`).

6. **Fetch-by-ID on edit pages** — form pages must work when navigated to
   directly (browser refresh, shared URL). Requires per-entity get-by-ID
   queries where missing.

7. **Integrate with existing sub-pages** — Route Stops and Trip Staff
   Assignment are already separate pages. Form pages must link to them
   clearly rather than duplicating or orphaning them.

---

## Decision: Dialog vs. Full Page

**Principle:** Stay in dialog unless (a) form requires scrolling, or (b)
there is a multi-step flow or complex interaction.

**Multi-column principle:** For medium-complexity dialogs (~8–10 fields),
use 2-column grid layouts instead of single-column vertical scroll. This
eliminates scrolling and eliminates the reason to move to a page.

### Forms → Full Pages (4)

| Form | Reason | Proposed Sections |
|------|--------|-------------------|
| Maintenance | 9 diverse fields + scrolls | "Thông tin chung" · "Chi phí & Thực hiện" · "Lịch bảo trì" · "Ghi chú" |
| Trips | DateTime UX + FK deps + scrolls | "Hành trình" · "Thời gian" · "Điều chỉnh" |
| Employees | 6 fields + 2-step save (employee → role) | "Thông tin nhân viên" · "Bằng lái" · "Phân công vai trò" |
| Routes | 7 fields + 2 FK dropdowns + scrolls | "Thông tin tuyến" · "Điểm đi & Đến" · "Thông số" |

### Forms → Stay as Dialogs (5)

| Form | Layout approach | Sections |
|------|----------------|----------|
| Vehicles | 2-col grid | "Thông tin xe" · "Vận hành & Bảo trì" |
| Customers | 2-col grid | "Thông tin cá nhân" · "Giấy tờ & Địa chỉ" |
| Stations | 2-col grid | "Thông tin trạm" · "Tọa độ & Trạng thái" |
| Vehicle Types | Single col (seat layout editor is visual) | "Thông tin loại xe" · "Sơ đồ chỗ ngồi" |
| Roles | No sections needed — name + permissions chips (already compact) | — |

---

## Focus Fix Approach

Current pattern (all dialogs):
```tsx
<div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
```

The `overflow-y-auto` container clips focus rings on edge inputs.

Fix: add `p-[3px] -m-[3px]` to the scrollable container so ring stays
within bounds. Apply to all 5 dialogs that remain.

---

## Shared `FormSection` Component

Create `@shared/ui` component for consistent section headers:

```tsx
// Usage
<FormSection title="Thông tin chung">
  {/* fields */}
</FormSection>
```

Visual: small bold label above a subtle `<hr>` divider. Lightweight —
no card/box border. Used across all redesigned forms (pages + dialogs).

---

## Full-Page Form Design Constraints

- **Max width:** `max-w-2xl mx-auto` — prevents stretching on wide screens
- **Page header:** title + back button (navigate to list)
- **Dirty state guard:** `useBlocker` from React Router — show confirm
  dialog "Thoát? Dữ liệu chưa được lưu." when navigating away with
  unsaved changes
- **Fetch-by-ID:** edit routes (`/entity/:id/edit`) must fetch entity by ID;
  verify or add per-entity get-by-ID hooks where missing
- **Loading skeleton:** show skeleton while entity loads on edit pages
- **Error state:** show error + retry if entity fetch fails (e.g., 404)

---

## Routing Changes

New routes to add for form pages:

| Entity | New Routes |
|--------|-----------|
| Maintenance | `/maintenance/new`, `/maintenance/:id/edit` |
| Trips | `/trips/new`, `/trips/:id/edit` |
| Employees | `/employees/new`, `/employees/:id/edit` |
| Routes | `/routes/new`, `/routes/:id/edit` |

Existing sub-page routes remain unchanged:
- `/routes/:id/stops` — Route Stops Editor (Phase 4)
- `/trips/:id/staff` — Staff Assignment (Phase 6)

**Integration with sub-pages:**
- Route form page → "Lưu & Chỉnh sửa điểm dừng" button navigates to
  `/routes/:id/stops` after save
- Trip form page → "Lưu & Phân công nhân viên" button navigates to
  `/trips/:id/staff` after save (create mode only)

---

## List Page Changes (all 4 moving to pages)

For each form being moved to a page, update its list page:
- "Thêm mới" button: `navigate('/entity/new')` instead of `setOpen(true)`
- Row action "Sửa": `navigate('/entity/:id/edit')` instead of opening dialog
- Remove dialog state (`open`, `selectedItem`, form dialog import)

---

## Fetch-by-ID Prerequisites

Verify these hooks exist — add if missing:

| Entity | Hook needed | Current status |
|--------|------------|----------------|
| Maintenance | `useMaintenanceLog(id)` | Likely missing — check `@entities/maintenance-log` |
| Trip | `useTrip(id)` | Likely missing — check `@entities/trip` |
| Employee | `useEmployee(id)` | Likely missing — check `@entities/employee` |
| Route | `useRoute(id)` | Likely missing — check `@entities/route` |

Each hook: `supabase.from(...).select(...).eq('id', id).single()`

---

## Open Questions (resolved)

- ✅ Vehicles: stay in dialog, improve with 2-column layout
- ✅ Focus fix scope: dialogs only (not a concern on regular pages)
- ✅ Section style: labeled divider, no heavy card UI
- ✅ Complexity threshold: scroll OR multi-step = move to page
- ✅ Route Stops + Trip Staff: remain as separate pages, linked from form pages
- ✅ Dirty state guard: include for all 4 form pages
- ✅ Fetch-by-ID: include per-entity hooks as prerequisites

---

## Suggested Plan Structure

**Plan 10-01:** Shared foundation
- `FormSection` component in `@shared/ui`
- Focus fix applied to all 5 remaining dialogs
- Dialog layout improvements (Vehicles 2-col, Customers 2-col,
  Stations 2-col, Vehicle Types sections, Roles unchanged)

**Plan 10-02:** Maintenance form page
- Fetch-by-ID hook, form page component, router wiring, list page update

**Plan 10-03:** Trip form page
- Fetch-by-ID hook, form page component, router wiring, list page update
- "Lưu & Phân công nhân viên" integration with existing staff page

**Plan 10-04:** Employee form page
- Fetch-by-ID hook, form page component, router wiring, list page update

**Plan 10-05:** Route form page
- Fetch-by-ID hook, form page component, router wiring, list page update
- "Lưu & Chỉnh sửa điểm dừng" integration with existing stops page

---
*Context written: 2026-04-17 — ready for /paul:plan*
