# Enterprise Plan Audit Report

**Plan:** .paul/phases/06-trip-scheduling/06-01-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan follows well-established CRUD patterns from Phases 3-5 and is structurally sound. However, two must-have fixes are required before execution:

1. **Silent time display corruption** — the `toDatetimeLocal` helper would show UTC times instead of local times on edit, causing dispatchers to see and potentially re-save incorrect departure/arrival times.
2. **Silent data corruption on price_override** — `z.coerce.number()` coerces `null` → `0`, turning "use default price" into "free trip" without any error.

Both are latent bugs that would not surface in happy-path testing but would corrupt data in production.

---

## 2. What Is Solid

- **Entity slice pattern**: Follows the exact `model/types → api/*.api → api/*.queries → index.ts` structure established in Phases 3-5. No deviation.
- **FK join query design**: The `TRIP_SELECT` constant with nested `route:routes(..., origin_station:stations!fk, destination_station:stations!fk), vehicle:vehicles(...)` is correct PostgREST embedding syntax.
- **Error mapping strategy**: Uses `.code` field for SQLSTATE matching (not `msg.includes`), with context-aware `23503` split for mutate vs delete. Consistent with 05-02 audit finding.
- **Cross-field validation**: `superRefine` for departure < arrival is correctly specified with error on `estimated_arrival_time` path.
- **Boundaries**: Correctly protects all stable layers (migrations, routes config, sidebar, existing entities, shared UI).
- **Scope limits**: Clear deferral of trip_staff, calendar, my-schedule, conflict detection to subsequent plans.
- **hasInitializedRef pattern**: Correctly specified to prevent TanStack Query background refetch race condition.
- **FK dropdown pattern**: `FK_DROPDOWN_PAGE_SIZE=1000` with truncation warning — consistent with established pattern.

---

## 3. Enterprise Gaps Identified

1. **Timezone handling in `toDatetimeLocal`**: `iso.slice(0, 16)` extracts UTC time digits. For a trip departing at 08:30 Vietnam time (stored as "2026-04-16T01:30:00Z"), the edit form would show "2026-04-16T01:30" — the user sees 01:30, not 08:30. If saved without correction, the departure time shifts by 7 hours.

2. **`z.coerce.number()` null coercion**: `Number(null) === 0` in JavaScript. When `price_override` is null (meaning "use route's default price"), `z.coerce.number()` silently converts it to 0. The result: a trip that should use the route's base_price instead gets price_override=0, making it free. No validation error, no user feedback.

3. **No datetime format validation**: `z.string().min(1)` accepts any non-empty string for departure/arrival time. A malformed value would only fail at the DB level with an unhelpful 22007 error, not at the form level with a clear Vietnamese message.

4. **Direct dayjs import instead of shared utility**: The plan imports `dayjs` directly for column formatting when `formatDateTime` from `@shared/lib/format-date` already exists and handles null/undefined. Inconsistent with project patterns.

5. **Missing list error state AC**: The plan mentions error state in the task description but has no acceptance criterion for it. Prior audits (03-02) added explicit ACs for this.

6. **No regression checkpoint**: Router.tsx modification has no verification step to confirm existing routes still work. Prior audits consistently required this.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `toDatetimeLocal` shows UTC time instead of local time | Task 2 action — `toDatetimeLocal` definition | Replaced `iso.slice(0, 16)` with `new Date(iso)` + local component extraction. Added rationale explaining why slice is wrong and showing correct implementation. |
| 2 | `z.coerce.number()` coerces null→0 (free trip) | Task 2 action — `price_override` Zod field | Changed from `z.coerce.number().min(0).nullable().or(...)` to `z.preprocess((v) => (v === '' \|\| v === null \|\| v === undefined ? null : v), z.coerce.number().min(0).nullable())`. Added inline comment explaining the null→0 coercion hazard. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | No datetime format regex validation | Task 2 action — departure_time/estimated_arrival_time Zod fields | Changed from `z.string().min(1, ...)` to `z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Thời gian không hợp lệ')`. Catches malformed values at form level. |
| 2 | `TripImport` typo in serializeToInsert | Task 2 action — serializeToInsert definition | Fixed to `TripInsert`. |
| 3 | Missing list error state AC | Acceptance Criteria | Added AC-6: List Query Error State with Given/When/Then for error rendering with retry button. Added AC-6 reference in Task 2 error state description. |
| 4 | Direct dayjs import instead of shared formatDateTime | Task 2 action — DataTable columns + import | Changed to use `formatDateTime` from `@shared/lib/format-date`. Updated column descriptions to use `formatDateTime()` calls. |
| 5 | No regression checkpoint after router.tsx change | Task 3 verify | Added step 9: regression check — navigate to /vehicles, /routes, /stations, /employees, /roles to confirm existing routes still render. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Timezone-aware date range filtering: `dateFrom + 'T00:00:00'` compared against timestamptz uses UTC midnight, not Vietnam midnight. Trips near midnight boundary could be missed. | Requires project-level timezone strategy (Supabase session timezone, PostgREST headers, or client-side UTC offset). This is an architectural decision that affects all date-based filtering across the application, not just trips. Defer to a dedicated timezone-architecture decision. |
| 2 | `formatCurrency(null)` returns "0 ₫" instead of "—" | Plan already specifies null-check before calling formatCurrency. Implementation detail, not a plan gap. |

---

## 5. Audit & Compliance Readiness

**Defensible audit evidence:** The plan produces a standard CRUD trail with toast notifications for all state changes. No payments or external API calls are involved in this plan, reducing compliance surface.

**Silent failure prevention:** The must-have fixes prevent two specific silent data corruption scenarios (timezone shift and null→0 price coercion). Without these fixes, the system would accept and store incorrect data without any error indication.

**Post-incident reconstruction:** Trip records have `created_at`/`updated_at` timestamps managed by DB triggers. No audit trail columns (created_by, updated_by) exist on the trips table — this was identified in Phase 3 audit as a residual compliance gap and remains deferred to a future schema-delta plan.

**Ownership and accountability:** The plan follows the established FSD entity ownership model — `@entities/trip` owns the data layer, `@pages/trips` owns the UI layer. Clear separation.

---

## 6. Final Release Bar

**Must be true before this plan ships:**
- `toDatetimeLocal` correctly converts UTC timestamptz to local datetime for form display
- `price_override` null handling does not silently coerce to 0
- `npm run build` passes with zero errors
- All 6 acceptance criteria pass (including new AC-6 for error state)
- Regression check confirms existing routes still work

**Remaining risks if shipped as-is (after fixes):**
- Date range filters use UTC comparison — trips near Vietnam midnight boundary may be excluded from filter results. Low severity, affects edge cases only.
- No created_by/updated_by audit columns on trips table — deferred to future schema-delta plan.

**Would I sign my name to this system after the fixes are applied?** Yes, conditionally. The CRUD layer is sound. The two must-have fixes address real data corruption risks. The deferred items are appropriately scoped for later phases.

---

**Summary:** Applied 2 must-have + 5 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
