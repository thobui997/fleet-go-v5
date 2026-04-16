# Enterprise Plan Audit Report

**Plan:** .paul/phases/06-trip-scheduling/06-03-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable** — the plan is clean and well-scoped for a read-only display feature. One must-have runtime bug (PGRST116 crash on employee lookup) and four strengthening items were applied. After these changes, the plan is ready for APPLY.

This is a low-risk plan — no mutations, no side effects, no payment flows. The primary risks are edge-case crashes (missing employee record) and inconsistent error handling patterns.

## 2. What Is Solid

- **Scope restraint**: Calendar is month-only, My Schedule is list-only. No scope creep. Appropriate for MVP.
- **No new dependencies**: dayjs + Tailwind CSS grid avoids a calendar library dependency. Correct call for this project's stack.
- **Entity-only API additions**: Only adding new functions to existing entity slices, not modifying stable APIs from 06-01/06-02.
- **Clear vertical slices**: Task 1 = calendar (API + page + route), Task 2 = schedule (API + page + route). Clean task boundaries.
- **Boundaries section**: Correctly protects existing types, pages, and API functions.

## 3. Enterprise Gaps Identified

1. **fetchMySchedule PGRST116 crash** (must-have): `.single()` on employee lookup throws PGRST116 when no employee exists. This is the expected case for users without an employee record. Without catching it, the query crashes and the user sees an error instead of an informational message.

2. **Auth-expiry handling missing** (strongly-recommended): Both new API functions don't handle 401/403/PGRST301. Every prior audit (03-01 through 06-02) required this pattern. The pages need auth-expiry error messages consistent with `mapTripError`.

3. **Calendar today highlight missing** (strongly-recommended): No visual distinction for today's date cell. Basic calendar UX expectation — without it, users lose temporal orientation in the grid.

4. **Calendar trip grouping by day-number only** (strongly-recommended): `dayjs(t.departure_time).date() === day` compares only the day-of-month number, not the full date. While currently safe (date range filter ensures single-month data), it's semantically fragile and will break silently if the data scope ever changes.

5. **PostgREST nested ordering uncertainty** (strongly-recommended): The plan acknowledges `referencedTable` ordering may not work but leaves the fallback as an aside. Client-side sort should be the explicit primary approach, not a contingency.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | PGRST116 crash on employee `.single()` lookup | Task 2 action step 1, AC-3 | Added explicit `if (error?.code === 'PGRST116') return []` handling. Updated AC-3 with Given/When/Then for no-employee case. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Auth-expiry error handling | Task 1 action step 1 + 5, Task 2 action step 1 + 5, AC-6 | Added 401/403/PGRST301 checks to both API functions and page error handling. Updated AC-6 to cover auth-expiry message. |
| 2 | Calendar today cell highlight | Task 1 CalendarGrid action, AC-2 | Added `bg-primary/10 ring-1 ring-primary` highlight for today's cell. Updated AC-2. |
| 3 | Full-date trip grouping | Task 1 CalendarGrid action | Changed from `.date() === day` to `format('YYYY-MM-DD') === cellDate` with full date computation per cell. |
| 4 | Client-side sort as primary | Task 2 action step 3 | Removed PostgREST `referencedTable` ordering. Specified client-side `.sort()` by `departure_time` as the primary approach. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | URL-synced calendar month state | Deferred consistently across prior audits (03-01, 04-01, 04-02). React state resets on navigation — acceptable for MVP. |
| 2 | Calendar trip click-through to detail | Display-only calendar for MVP. Click-to-navigate is a UX enhancement, not a correctness requirement. |

## 5. Audit & Compliance Readiness

- **Error states**: Both pages now have comprehensive error handling including auth-expiry (post-audit)
- **Non-employee users**: Gracefully handled via PGRST116 catch + informational message (post-audit)
- **No audit trail risk**: Read-only views — no mutations that require audit logging
- **No silent failures**: PGRST116 was the only silent-failure risk; now explicitly handled

## 6. Final Release Bar

**Must be true before shipping:**
- PGRST116 catch in fetchMySchedule prevents crash for non-employee users
- Auth-expiry errors surface Vietnamese message on both pages
- Today cell is visually distinguishable in calendar grid

**Remaining risks (acceptable):**
- Calendar month state not URL-persisted (user loses position on navigation)
- No click-through from calendar trip cards (display only)

**Sign-off**: Plan is conditionally acceptable for production after applied changes.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
