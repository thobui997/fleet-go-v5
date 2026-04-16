# Enterprise Plan Audit Report

**Plan:** .paul/phases/08-dashboard-analytics/08-02-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable** — the plan was well-structured but had one must-have gap: chart components lacked error/retry states, breaking consistency with 08-01's established pattern where every data section (stat cards, bookings, trips) handles loading/error/empty/retry independently. After applying 1 must-have and 5 strongly-recommended upgrades, the plan is ready for APPLY.

## 2. What Is Solid

- **FSD layering correct**: Charts placed under `src/pages/dashboard/ui/` — proper page-level components, no cross-import violations
- **Client-side aggregation avoids DB changes**: No migrations, no new RPC functions — grouping by status/date client-side is appropriate for MVP data volumes
- **Boundaries are well-defined**: Entities, shared libs, stat-card, and DB schema are explicitly protected
- **Longer staleTime for chart queries**: 5 minutes vs 30 seconds for stats is appropriate — chart data queries are heavier and less time-sensitive
- **Layout strategy sound**: Revenue full-width, status charts side-by-side — follows standard dashboard layout patterns
- **Color maps defined upfront**: Concrete hex values for all status colors — avoids ambiguity during implementation

## 3. Enterprise Gaps Identified

1. **Missing error/retry states on chart components (MUST-HAVE)**: Chart components only accepted `data` and `loading` props. Every dashboard section from 08-01 has error states with retry buttons (AC-1b, AC-2b, AC-3b in 08-01-SUMMARY). Charts without error recovery leave users staring at broken charts with no action path — silent failure is unacceptable.

2. **Auth-expiry handling not explicit for chart API functions**: Task 1 didn't mention reusing `handleAuthExpiry` from dashboard.api.ts. While the function exists and can be reused, the plan should state this requirement explicitly to prevent oversight during implementation.

3. **formatCurrency too verbose for YAxis labels**: `formatCurrency()` outputs "1.500.000 ₫" — this is 13+ characters per tick mark, causing overlapping labels on the Y-axis. Need abbreviated format for axis (full format for tooltips only).

4. **PieChart empty data array risk**: Plan says "filter out zero-value entries" but an all-zero dataset produces an empty array passed to Pie, which can cause recharts rendering issues or a blank chart with no user feedback.

5. **CSS variable in SVG context**: `hsl(var(--primary))` may not resolve correctly when used as `stroke` attribute in SVG elements rendered by recharts. Concrete hex values are safer.

6. **No regression checkpoint for 08-01 sections**: After integrating charts into dashboard-page.tsx, there's no explicit check that stat cards and quick views still render correctly.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Chart components missing error/retry props and states | AC-1b, AC-2b, AC-3b added; Task 2 props updated for all 3 charts; error state UI specified (AlertCircle + retry); dashboard-page integration passes error/onRetry props | Added AC-1b, AC-2b, AC-3b acceptance criteria. Updated all chart component prop definitions to include `error: unknown` and `onRetry: () => void`. Added error state rendering (AlertCircle + "Không thể tải dữ liệu" + retry button) to each chart component. Updated dashboard-page integration to pass error/refetch props. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Auth-expiry not explicit for chart API functions | Task 1, step 3 | Added requirement: "All three functions MUST reuse existing handleAuthExpiry for PGRST301/401/403 detection and signOut trigger. Throw on Supabase error after calling handleAuthExpiry." |
| 2 | formatCurrency too verbose for YAxis | AC-1 (YAxis description); Task 2, revenue chart config | Updated AC-1 to specify "abbreviated, e.g., '1.5tr'". Added explicit tickFormatter logic in revenue chart config: abbreviated format for axis (tr/k suffixes), full formatCurrency for tooltip only. |
| 3 | PieChart empty data guard | Task 2, trip-status-chart and booking-status-chart | Added empty state guards: "Không có dữ liệu" when data array is empty or total count is 0 — guard before passing to Pie/BarChart to prevent recharts rendering issues. |
| 4 | CSS variable may not resolve in SVG | Task 2, IMPORTANT section; revenue chart Line stroke | Changed from `hsl(var(--primary))` to concrete hex `#2563eb` (blue-600). Added IMPORTANT note: "Use concrete hex colors, not CSS variables — SVG stroke/fill may not resolve hsl(var(--primary))". |
| 5 | Regression checkpoint for 08-01 sections | Task 2, verify step | Added verify step 7: "Stat cards and quick views from 08-01 still render correctly (no regressions)". Added to verification checklist. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | recharts bundle size (~400KB) | recharts is tree-shakeable; for MVP the full import is acceptable. Dynamic imports can be added in performance optimization phase. |
| 2 | Chart accessibility (ARIA labels) | Recharts lacks built-in ARIA support. Important for accessibility compliance but deferrable for internal admin tool MVP. |
| 3 | Dark mode chart color adjustments | Shadcn theme CSS variables handle basic theming. Chart-specific dark mode colors can be refined in UX polish phase. |
| 4 | Responsive tooltip positioning on mobile | recharts tooltips can overflow viewport on small screens. Acceptable for MVP — no data loss, just positioning. |

## 5. Audit & Compliance Readiness

- **Error handling**: After applying findings, all chart sections handle loading/error/empty/retry consistently with 08-01 pattern — defensible to auditors
- **Auth-expiry detection**: Explicitly required for all chart API functions — prevents stale sessions on dashboard
- **No silent failures**: Empty data states are explicit ("Không có dữ liệu"), no blank/broken chart rendering
- **Post-incident reconstruction**: TanStack Query keys are well-structured ('dashboard', 'revenue-trend' etc.) — easy to trace in devtools

## 6. Final Release Bar

**What must be true before this plan ships:**
- All three charts render with loading, error, and empty states
- YAxis uses abbreviated format (not full formatCurrency)
- Auth-expiry detected in all chart API functions
- 08-01 dashboard sections (stat cards, quick views) render without regression
- Build passes with zero errors

**Remaining risks if shipped as-is:**
- recharts bundle size (~400KB added to vendor chunk) — acceptable for admin tool
- No chart accessibility (ARIA) — acceptable for internal tool
- No dark mode color adjustments — charts use hardcoded hex colors

**Sign-off:** Plan is conditionally acceptable and ready for APPLY after applied upgrades.

---

**Summary:** Applied 1 must-have + 5 strongly-recommended upgrades. Deferred 4 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
