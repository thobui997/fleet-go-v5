# Phase Context

**Phase:** 09 — Layout Refactor: Viewport-Constrained List Pages
**Generated:** 2026-04-17
**Status:** Ready for planning

## Goals

- All 11 list/table pages should be viewport-contained — no full-page scroll on list views
- Only the table body scrolls vertically; page chrome (title, filters, action buttons) stays fixed in view
- Table headers are sticky — column labels remain visible while scrolling through rows
- Pagination bar stays anchored below the scrollable table area
- Behavior is consistent across all list pages: Vehicles, Vehicle Types, Maintenance Logs, Stations, Routes, Employees, Roles, Customers, Bookings, Payments, Trips
- Detail/dialog pages (Booking Detail, Check-in, My Schedule, Trip Calendar, Dashboard) are explicitly out of scope — full-page scroll remains acceptable for those

## Approach

- Fix at **3 levels** in order: AppLayout → DataTable → each list page
  - **AppLayout:** change root from `min-h-screen` to `h-screen overflow-hidden`; content column becomes `flex flex-col h-screen`; `<main>` becomes `flex-1 overflow-hidden` (not `overflow-y-auto`)
  - **DataTable:** root wrapper becomes `flex flex-col h-full gap-4`; table wrapper gets `flex-1 overflow-auto rounded-md border`; `<TableHeader>` gets `sticky top-0 bg-background z-10`
  - **Each list page:** adopt `flex flex-col h-full` layout — fixed header section + `flex-1 overflow-hidden` container for DataTable
- Fix at the **DataTable component level** — all tables inherit the behavior automatically, avoiding duplicated layout logic per page
- Desktop-first: mobile keeps normal scrolling; no sticky enforcement on mobile

## Constraints

- Desktop only — mobile should keep natural scrolling; use `md:` breakpoint prefix for sticky/viewport constraints where needed
- DataTable is shared across all 11 list pages — changes must be backward-compatible with all consumers
- Do not change detail/dialog pages that legitimately need full-page scroll (Dashboard, Booking Detail, Check-in, Trip Calendar, My Schedule)

## Open Questions / Risk Items

1. **Non-list pages need opt-in scroll:** When `<main>` becomes `overflow-hidden`, pages that need full-page scroll (Dashboard, Booking Detail, Check-in, My Schedule, Trip Calendar — ~5–6 pages) must add `h-full overflow-y-auto` to their own root wrapper. Must enumerate and touch all affected pages.

2. **Sidebar positioning assumption:** AppLayout uses `ml-64`/`ml-16` margin approach — sidebar is likely `position: fixed`. Changing root to `h-screen overflow-hidden` should be safe but must verify sidebar positioning during planning.

3. **Sticky header z-index vs. action dropdowns:** Per-row "Actions" buttons use Radix `DropdownMenu` (portaled to `document.body`) — safe. Any non-portaled inline `Select` or `Popover` inside table cells could render beneath the sticky `z-10` header. Audit all list pages during planning.

4. **Minimum usable table height:** On short viewports (768px laptops with tall filter bars), the scrollable table area could shrink to almost nothing. Add `min-h-[200px]` or similar to the table scroll wrapper.

5. **`space-y-4` → `gap-4` in DataTable:** Current DataTable root uses `space-y-4`. Switching to `flex flex-col h-full` requires `gap-4` instead — `space-y-*` does not apply correctly between flex children.

## Additional Context

- Current DataTable is at `src/shared/ui/data-table.tsx` (lines 42–207)
- Current AppLayout is at `src/app/layouts/app-layout/ui/app-layout.tsx` (lines 7–83)
- AppLayout's `<main>` currently: `p-6 overflow-y-auto` — this is the root cause of full-page scroll
- DataTable currently wraps the table in `rounded-md border` with no height or overflow constraints
- Shadcn/ui `<TableHeader>` / `<TableHead>` are standard `<thead>` / `<th>` elements — `sticky top-0` works natively once the scroll container is set correctly on the parent

---

*This file is temporary. It informs planning but is not required.*
*Created by /paul:discuss, consumed by /paul:plan.*
