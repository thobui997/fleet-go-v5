# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-route-station-management/04-03-PLAN.md
**Audited:** 2026-04-15
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — approved after applying 3 must-have + 4 strongly-recommended fixes.**

The plan is architecturally sound: correct FSD layering, established entity-slice pattern, @dnd-kit used correctly (sensors, arrayMove, closestCenter), Dialog-based editor avoiding unnecessary router complexity. The bulk-replace save pattern is appropriate for this use case.

Three issues prevented unconditional acceptance: a silent data-loss race condition in the editor, a React component-identity bug that would make DnD non-functional, and a schema coercion defect that would silently write incorrect data to the database. All three have been applied to the plan.

---

## 2. What Is Solid

- **FSD layering**: `@entities/route-stop` correctly isolated from page layer; no cross-imports between entity slices; index.ts public API pattern followed.
- **Bulk-replace save pattern**: Pragmatic for MVP. The DELETE+INSERT approach avoids complex diff logic while accepting documented non-atomicity risk.
- **useSaveRouteStops onSuccess(_data, { routeId })**: Correctly accesses variables from TanStack Query v5's second argument — not the common mistake of reading from the result.
- **`enabled: !!routeId` guard**: Prevents empty-routeId queries. Consistent with existing hooks.
- **DnD sensor configuration**: Both PointerSensor and KeyboardSensor registered — accessibility considered at design time.
- **Dialog close guard (isPending)**: Prevents accidental dismiss during in-flight saves — established pattern applied correctly.
- **`stations?.data?.find()` for locked station names**: Reuses already-fetched stations data to resolve origin/destination names; no extra queries needed.
- **FK_DROPDOWN_PAGE_SIZE = 1000**: Consistent with established project constant; defined locally (not imported cross-schema) to respect FSD boundaries.
- **Boundary section**: Comprehensively protects completed Phase 1–3 infrastructure and all existing route/station entities from scope creep.

---

## 3. Enterprise Gaps Identified

### GAP-1: Background refetch race condition (CRITICAL — data loss)
`useEffect([open, stopsData])` fires whenever TanStack Query background-refetches (default staleTime=0). Each refetch updates `stopsData` → effect fires → `setLocalStops` resets to DB state → **all unsaved user edits are silently discarded**. A dispatcher who spends 2 minutes reordering 10 stops then experiences a background refetch loses all work without any warning. This is silent data loss in the editor.

### GAP-2: SortableStopRow defined as local function component (CRITICAL — DnD broken)
The plan permitted defining `SortableStopRow` "inline or as a local function component." When a component is defined inside another component's render scope (`function SortableStopRow(...)` inside `export function RouteStopsDialog(...)`), React creates a **new component type reference on every parent render**. On every state change (drag start, stop add, etc.), React unmounts all existing `SortableStopRow` instances and mounts new ones. DnD active state, animations, and aria-live regions are destroyed immediately. The stops editor would be unusable for drag operations.

### GAP-3: `z.coerce.number()` on empty string produces 0, not null
`Number('') === 0`. For optional fields `distance_from_origin` and `arrival_time_minutes`, an empty input silently saves as `0` to the database. A stop with `distance_from_origin = 0` and `arrival_time = "00:00:00"` is factually wrong and indistinguishable from an explicit "departure point" marker. Trip scheduling in Phase 6 consuming these values would produce incorrect timings.

### GAP-4: `useId` import — wrong hook, not used
`useId` is a React 18 hook for generating stable IDs for accessibility. No usage was described in the component. The fix for GAP-1 requires `useRef` — the intent was likely `useRef`, not `useId`. An unused import produces a lint warning and signals sloppy implementation.

### GAP-5: "Hủy" button doesn't reset add-stop form values
Hiding the add-stop form with `setShowAddForm(false)` without calling `reset()` means partial form state persists. Re-opening the form shows stale values — confusing UX that could lead to unintended stop additions.

### GAP-6: `mapRouteStopError` default message doesn't signal partial-failure urgency
The save operation is non-atomic. On INSERT failure after successful DELETE, all stops are wiped from the database. The default error "Thao tác thất bại. Vui lòng thử lại." gives no indication that data may already be partially affected. The established project pattern (`mapSupabaseError(error, context?)`) supports context-specific default messages — this function should follow the same convention.

### GAP-7: Human-verify checkpoint missing keyboard DnD test
`KeyboardSensor` is wired into DnD sensors but no verification step tests it. Without a keyboard test, a misconfiguration (wrong `coordinateGetter`, missing `aria-roledescription`) could go undetected. The accessibility gap would surface after deployment.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Background refetch race condition — `[open, stopsData]` useEffect resets localStops on every background refetch, silently discarding user edits | Task 2 action → useEffect description | Replaced useEffect pattern with `hasInitializedRef = useRef(false)` guard. Ref set to `true` on first init, reset to `false` on close. Checks `stopsData !== undefined` (not falsy) to handle empty-array case. |
| 2 | SortableStopRow as local function component breaks DnD — React re-creates component type every parent render, unmounting all stop rows on each state change | Task 2 action → AVOID section | Added CRITICAL constraint: SortableStopRow MUST be defined at module level (above RouteStopsDialog), not inside the parent function body. |
| 3 | `z.coerce.number()` on empty string → 0, not null — silently writes incorrect 0 km / 0-minute data | Task 2 action → addStopFormSchema | Wrapped both `distance_from_origin` and `arrival_time_minutes` with `z.preprocess((v) => (v === '' || v == null) ? null : v, z.coerce.number()...)`. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 4 | `useId` import unused; `useRef` needed for hasInitializedRef | Task 2 action → imports | Replaced `useId` with `useRef` in React imports. |
| 5 | "Hủy" button doesn't reset add-stop form values — stale partial inputs reappear on re-open | Task 2 action → layout description | Added NOTE: "Hủy" onClick must call both `reset()` AND `setShowAddForm(false)`. |
| 6 | `mapRouteStopError` default message doesn't signal partial-failure risk for non-atomic save | Task 2 action → schema definition + save handler | Added `context?: 'save'` parameter; default case when `context === 'save'` returns "Lưu thất bại — vui lòng thử lại để tránh mất dữ liệu điểm dừng."; call site updated to pass `'save'`. Updated AC-7 to reflect new default message. |
| 7 | Checkpoint doesn't test keyboard DnD accessibility | Checkpoint task → how-to-verify | Added step 12: Tab to drag handle, Space to pick up, ArrowDown/ArrowUp to move, Space to drop. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 8 | Station name loading state — new stops show raw UUID until `useStations` resolves | `useStations` is always enabled and loads fast (same session-cached data used by route form). Raw UUID display is transient and cosmetic. Acceptable for admin portal MVP. |
| 9 | Non-atomic save not commented in function body — `saveRouteStops` has no inline comment about partial failure risk | Already documented in Task 1 plan action as a NOTE. Code comments would improve long-term maintainability but are not critical for correctness. |
| 10 | `distance_from_origin` / `arrival_time` display formatting in stop rows — raw numbers shown instead of "X km" / "Xh Ym" | Display-only, no data integrity impact. Can be addressed in a UI polish pass before Phase 6 ships. |

---

## 5. Audit & Compliance Readiness

**Evidence production:** The plan produces no explicit audit trail for stop changes (no `updated_at`, no created_by). Acceptable for MVP — the `route_stops` table itself doesn't have audit columns in the Phase 2 schema. Phase 6 trip scheduling depends on correct stop data; correctness is enforced by DB constraints (UNIQUE route_id+stop_order, UNIQUE route_id+station_id, RESTRICT on station delete).

**Silent failure prevention:** GAP-1 (data loss) and GAP-3 (wrong zero values) were both silent failures. Both have been remediated. Post-fix, all failures surface as toast errors or inline messages.

**Post-incident reconstruction:** The non-atomic save is the main reconstruction concern. If a dispatcher loses stops due to a partial save failure, the only recovery path is re-entering stops manually. This risk is explicitly surfaced in the error message after the audit fix (GAP-6). Full atomicity requires a PostgreSQL function or server-side transaction — deferred to GA.

**Ownership:** The plan assigns responsibility clearly. The checkpoint requires explicit human approval before the plan closes.

---

## 6. Final Release Bar

**What must be true before this plan ships:**
1. `hasInitializedRef` guard in place — no background refetch can discard user edits
2. `SortableStopRow` at module level — DnD functional under all state changes
3. `z.preprocess` on optional numeric fields — no silent 0 km / 0-minute writes
4. Human-verify checkpoint passed including keyboard DnD step
5. `npm run build` clean

**Remaining risks after fixes applied:**
- Non-atomic save: INSERT failure after DELETE wipes stops. User must retry or reload. Risk is explicitly messaged. Acceptable for MVP.
- No optimistic concurrency: two dispatchers editing the same route's stops simultaneously will last-write-win. Out of scope for Phase 4.
- Station name lookup via client-side find: with >1000 stations, lookups beyond FK_DROPDOWN_PAGE_SIZE would show raw UUIDs. Unlikely in MVP deployment window.

**Sign-off:** I would approve this plan for production after the 3 must-have fixes are applied. The fixes are targeted and do not change the architectural approach.

---

**Summary:** Applied 3 must-have + 4 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
