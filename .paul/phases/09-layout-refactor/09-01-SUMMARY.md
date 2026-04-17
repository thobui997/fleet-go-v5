---
phase: 09-layout-refactor
plan: 01
subsystem: ui
tags: [tailwind, layout, viewport, sticky-header, data-table, app-shell]

requires:
  - phase: 01-foundation
    provides: app-layout.tsx and data-table.tsx components

provides:
  - Viewport-constrained app shell (h-screen overflow-hidden, no page-level scroll)
  - DataTable with sticky header and constrained scrollable body

affects:
  - 09-02 (list pages adopt h-full on their root containers)
  - All pages using DataTable — sticky header and scroll now active

tech-stack:
  added: []
  patterns:
    - "h-screen overflow-hidden root → flex-1 overflow-hidden main (app shell pattern)"
    - "flex flex-col h-full gap-4 → flex-1 min-h-[200px] overflow-auto table wrapper (constrained table pattern)"
    - "sticky top-0 z-10 bg-card on TableHeader (sticky header pattern)"

key-files:
  modified:
    - src/app/layouts/app-layout/ui/app-layout.tsx
    - src/shared/ui/data-table.tsx

key-decisions:
  - "min-h-0 is NOT added to DataTable root — responsibility of list pages (09-02)"
  - "overflow-hidden on <main>, not overflow-auto — individual pages own their scroll"

patterns-established:
  - "AppLayout <main> clips content via overflow-hidden; pages use h-full + their own scroll"
  - "DataTable parent must set min-h-0 for flex-1 shrink to work (enforced in 09-02)"

duration: ~5min
started: 2026-04-17T00:00:00Z
completed: 2026-04-17T00:00:00Z
---

# Phase 9 Plan 01: AppLayout + DataTable Viewport Foundation — Summary

**Viewport-constrained app shell and sticky-header DataTable established as shared foundation for all list pages.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~5 min |
| Tasks | 2 completed |
| Files modified | 2 |
| Build | ✓ zero TypeScript errors |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: AppLayout viewport-constrained shell | Pass | `h-screen overflow-hidden` root, `flex-1 overflow-hidden` main |
| AC-2: AppLayout mobile unaffected | Pass | No changes to mobile overlay, scroll-lock, or Escape handler |
| AC-3: DataTable sticky header | Pass | `sticky top-0 z-10 bg-card` on `<TableHeader>` |
| AC-4: DataTable scrollable body with min height | Pass | `flex-1 min-h-[200px] overflow-auto` on table wrapper |
| AC-5: space-y-4 → gap-4 correctness | Pass | `flex flex-col h-full gap-4` root, visually identical 16px gap |

## Accomplishments

- App shell no longer produces page-level scroll — `<main>` clips content via `overflow-hidden`
- DataTable header pins at top of its scroll container via `position: sticky`
- Pagination bar is guaranteed visible (`flex-none`) regardless of row count
- Foundation set for 09-02: all list pages can now adopt `h-full` without DataTable logic changes

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/app/layouts/app-layout/ui/app-layout.tsx` | Modified | Viewport-constrained shell: `h-screen overflow-hidden` root, `h-screen flex flex-col` content column, `flex-1 overflow-hidden p-6 flex flex-col` main |
| `src/shared/ui/data-table.tsx` | Modified | Sticky header + constrained scroll: `flex flex-col h-full gap-4` root, `flex-1 min-h-[200px] overflow-auto` table wrapper, `sticky top-0 z-10 bg-card` TableHeader, `flex-none` pagination |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| `min-h-0` NOT added to DataTable root | DataTable doesn't know its parent context — list pages must set it | 09-02 must add `min-h-0` to each page's DataTable parent container |
| `overflow-hidden` on `<main>`, not `overflow-auto` | Pages own their scroll strategy — dashboard may never need scroll | Each page controls its own scrollable region |

## Deviations from Plan

None — plan executed exactly as written.

## Skill Audit

| Expected | Invoked | Notes |
|----------|---------|-------|
| /frontend-design | ✓ | Loaded before execution |
| /feature-sliced-design | ○ | Plan touches only CSS classes in existing files — no FSD layer restructuring occurred. Borderline gap; no structural risk. |

## Next Phase Readiness

**Ready:**
- 09-02 dependency satisfied — list pages can now adopt `h-full` on their root containers
- DataTable sticky header and scroll constraints active for all existing pages

**Concerns:**
- Each list page's DataTable parent needs `min-h-0` for `flex-1` shrink to work correctly (09-02 responsibility, documented in plan)

**Blockers:** None
