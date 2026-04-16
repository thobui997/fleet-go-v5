# Enterprise Plan Audit Report

**Plan:** .paul/phases/08-dashboard-analytics/08-01-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is for a read-only dashboard view — lower risk profile than transactional features. The core architecture (FSD boundaries, TanStack Query hooks, Supabase aggregation) is sound. However, the plan has a significant gap: zero error state handling across all data sections. Without it, any API failure results in infinite loading skeletons. The must-have fix (error states) and strongly-recommended upgrades (Promise.allSettled resilience, auth-expiry handling) have been applied. With these changes, the plan is ready for execution.

## 2. What Is Solid

- **FSD boundary enforcement:** Correctly copies SELECT strings instead of importing from entity APIs. Cross-import prevention is well-specified.
- **Read-only scope:** Dashboard is purely a view layer. No mutation operations reduces the risk surface significantly.
- **Loading states specified:** All data sections (stat cards, bookings, trips) have loading skeleton specifications.
- **Empty states specified:** Quick view tables handle the "no data" case with Vietnamese messages.
- **Boundary protection:** Entity slices, shared utilities, app layout, and database schema are explicitly protected.
- **Existing component reuse:** Card and Skeleton components are available at src/shared/ui/ and will be used directly.
- **Consistent patterns:** Follows the established API/query hook conventions from all prior entity implementations.

## 3. Enterprise Gaps Identified

1. **Error states completely absent** — AC-1 through AC-3 specify loading and empty states but no error states. The plan explicitly states "no custom error mapping needed for dashboard" which creates a UX where failed queries show loading skeletons indefinitely. For a dashboard landing page, this is unacceptable.

2. **Promise.all is fragile for multi-query stats** — fetchDashboardStats runs 4 parallel queries via Promise.all. If any one fails (e.g., vehicles table times out), ALL stat cards show as failed. A dashboard should show partial data when individual queries succeed.

3. **No auth-expiry handling** — Every prior plan (03-01 through 07-04) includes 401/403/PGRST301 detection with automatic signOut. This plan omits it. Dashboard queries still require auth — expired sessions should redirect to login.

4. **Component availability unverified** — Plan says "check if Card is available" but doesn't confirm. (Verified during audit: both Card and Skeleton exist at src/shared/ui/.)

5. **Task 1 verify step is weak** — Only says "npm run build completes" without specifying what to actually check in the built artifacts or source code.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Error states missing for all dashboard data sections | AC-1b, AC-2b, AC-3b added; Task 2 action, verify, done updated | Added three new ACs for error states. Added error/error+onRetry props to StatCard. Added error state with retry button to recent bookings and upcoming trips sections. Updated done criteria. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Promise.all fragility — one failure kills entire dashboard | Task 1 action (fetchDashboardStats) | Changed Promise.all to Promise.allSettled with per-result fallback to zero defaults. Added code example. |
| 2 | Auth-expiry handling (401/403/PGRST301) absent | Task 1 action (queries) + IMPORTANT section | Added handleAuthExpiry helper function specification. Added to IMPORTANT constraints. |
| 3 | Card/Skeleton component availability unverified | Task 2 action (stat-card.tsx) | Confirmed both exist at src/shared/ui/ and updated comment to reflect verification. |
| 4 | Task 1 verify step too weak | Task 1 verify | Added explicit checks: Promise.allSettled usage, handleAuthExpiry in all API functions, npm run build. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Server-side aggregation via Supabase RPC | Client-side aggregation is acceptable at MVP fleet scale (100-500 vehicles, <1000 daily transactions). Moving to RPC is a performance optimization, not a correctness fix. |
| 2 | Real-time updates via Supabase subscriptions | staleTime 30s provides sufficient freshness for an operational dashboard. Real-time subscriptions add complexity (connection management, reconnection) not justified for MVP. |
| 3 | Configurable date ranges for stats | Fixed "today" scope is the correct MVP scope. Date range selectors are a UX enhancement, not a correctness requirement. |

## 5. Audit & Compliance Readiness

- **Error visibility:** With must-have fix applied, all dashboard sections will surface errors with retry capability. No silent failures.
- **Auth compliance:** Auth-expiry handling ensures expired sessions are detected and user is redirected to login (after strongly-recommended fix applied).
- **Partial failure resilience:** Promise.allSettled ensures one query failure doesn't cascade to the entire dashboard.
- **No audit trail needed:** Dashboard is read-only — no mutations to audit.
- **Ownership:** Dashboard page is self-contained under src/pages/dashboard/ with clear public API export.

## 6. Final Release Bar

**What must be true before shipping:**
- All ACs (1 through 3b) pass — including error states on all sections
- npm run build passes with zero errors
- fetchDashboardStats uses Promise.allSettled in implementation
- Auth-expiry handling triggers signOut on expired sessions

**Remaining risks:**
- Client-side aggregation will not scale past ~10K vehicles/payments per day. Acceptable for MVP, flag for optimization.
- No retry limit on error retry buttons — users could spam retry on persistent failures. Low risk for MVP.

**Verdict:** Would sign off with must-have and strongly-recommended fixes applied.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
