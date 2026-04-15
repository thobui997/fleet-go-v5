# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-route-station-management/04-01-PLAN.md
**Audited:** 2026-04-15
**Verdict:** Conditionally acceptable (now ready — 7 upgrades applied)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan follows Phase 3 FSD patterns faithfully and covers all required CRUD concerns. Two release-blocking issues required immediate remediation before this plan could execute safely. Both have been applied. Five additional strongly-recommended upgrades prevent silent runtime failures that would otherwise only surface during UAT or production.

Would I approve this plan for production after audit? **Yes, with the 7 applied upgrades.**

---

## 2. What Is Solid

- **Entity slice structure**: types → api → queries → barrel follows established Phase 3 FSD contract exactly. No deviations.
- **`serializeToInsert` null coercions**: Every nullable field (`code`, `address`, `province`, `latitude`, `longitude`) has an explicit `'' → null` mapping. No implicit undefined-to-null assumptions.
- **Dialog close guard pattern**: Correctly propagated from Phase 3. `isPending` check on `onOpenChange` prevents data loss on slow network.
- **Error state with retry (AC-9)**: Present in both list page and form dialogs — not an afterthought.
- **23503 direction identified correctly**: Delete RESTRICT (from `routes` and `route_stops` FK) vs Phase 3's INSERT FK violation. The plan correctly distinguishes direction and produces accurate Vietnamese message.
- **`.or()` multi-column search**: Correct PostgREST syntax for searching across `name` and `city` simultaneously. Not naive single-column filter.
- **`isActive` boolean derivation**: String Select value (`'all'` / `'true'` / `'false'`) correctly mapped to `boolean | undefined` — avoids passing `false` when user wants "All" (which would filter out all active stations).
- **Boundaries section**: Explicitly excludes Phase 3 files, `supabase/migrations/`, and defers Route/RouteStop to 04-02/04-03. Scope creep is prevented at plan level.

---

## 3. Enterprise Gaps Identified

### Must-Have

**G1 — 23505 discrimination via generic `includes('name')` substring**
The original plan checked `error.message?.includes('name')` to identify a `name` unique constraint violation. The word `name` is ubiquitous in PostgreSQL error output — it appears in constraint names, column names, table names, and generic message prose. In a system with multiple tables, a 23505 on a different table's `name` column (e.g., `routes.name`) could produce an error message that accidentally matches this check, returning the wrong Vietnamese message. The proper check against `stations_name_key` constraint name (or Postgres `DETAIL` field `Key (name)=(value) already exists.`) is unambiguous.

**G2 — `serializeFormDefaults(station)` reference without definition**
The form dialog action referenced a function `serializeFormDefaults(station)` that is defined nowhere in the plan, in the form-schema spec, or in any referenced file. An implementer would encounter a ReferenceError at runtime (if defined in the component) or TypeScript error (if not imported). This is an undefined symbol in an executable plan — a blocking plan integrity failure.

### Strongly Recommended

**G3 — Search string not trimmed before `.or()` ilike filter**
A user pressing spacebar in the search input would pass `" "` to `fetchStations`. The trimmed string is empty but the raw string is non-empty — the `.or()` branch would fire with `ilike.% %` which matches differently than expected (would match rows with a space). Trim before the ilike check.

**G4 — `type="number"` for lat/lng inputs causes NaN on partial input**
`z.coerce.number()` correctly converts string `"21.5"` to number. However, if the HTML input uses `type="number"`, browsers return `NaN` when the user types `-` (the leading minus before completing a negative number like `-90`). `NaN` fails both the `z.coerce.number()` branch AND the `z.literal('')` branch, causing an immediate Zod validation error mid-input. `type="text"` with `z.coerce.number()` is the correct pattern for optional numeric inputs in React Hook Form — identical to Phase 3 maintenance `cost` and `odometer_reading`.

**G5 — `is_active` Switch requires `<Controller>`, not `register()`**
Shadcn/ui's `Switch` component uses `checked` / `onCheckedChange` props. React Hook Form's `register()` returns `value` / `onChange` props — these do not wire to a Switch correctly. A registered Switch will always report `undefined` or the string `"on"` instead of a boolean. `<Controller>` with `render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}` is required for correct boolean binding.

**G6 — Edit→create mode transition not specified for form reset**
The plan specified `serializeFormDefaults(station)` for edit mode only. When the `station` prop changes from a Station object back to `null` (user closes edit dialog, then opens create dialog), the form retains the previously-edited values unless explicitly reset. The `useEffect` must handle both branches: station !== null (edit: reset with station values) AND station === null (create: reset with empty defaults).

**G7 — Human-verify checkpoint missing regression test steps**
The `<success_criteria>` section stated "No regressions in /vehicles, /vehicle-types, /maintenance routes" but this check was absent from the `<checkpoint:human-verify>` steps. The checkpoint is the only place manual verification actually occurs — success_criteria without checkpoint steps is unverified. Regression navigation steps added to checkpoint.

### Can Safely Defer

**D1 — URL-synced filter state**: Search and status filter live in React component state. Browser navigation back/forward loses filter state. Acceptable for MVP back-office admin tool.

**D2 — `StationStatusBadge` component extraction**: Inline Badge for boolean is_active is acceptable. Phase 3 extracted `MaintenanceTypeBadge` for a 4-value enum — a boolean doesn't warrant extraction.

**D3 — ARIA labels for search input and status Select**: Accessibility gap consistent with deferred items from Phase 1 audit. Must address before public/regulated deployment (already in STATE.md deferred issues).

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | 23505 discrimination via generic `includes('name')` | AC-8, Task 2 `mapSupabaseError` spec | Changed to `message includes 'stations_name_key' OR details includes '(name)'`; added `details?: string` to error param type |
| 2 | `serializeFormDefaults` undefined reference | Task 2 form dialog action | Replaced with explicit inline `useEffect` mapping for both create (station===null) and edit (station!==null) branches |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Search not trimmed before ilike filter | Task 1 `fetchStations` action | Added `const q = (search ?? '').trim()` before `.or()` application |
| 2 | `type="number"` NaN on partial input | Task 2 Zod schema spec | Added explicit note: lat/lng Inputs MUST use `type="text"` |
| 3 | `is_active` Switch needs `<Controller>` | Task 2 form dialog fields layout | Replaced vague "Switch or Checkbox" with explicit `<Controller>` render prop pattern |
| 4 | Edit→create mode reset not specified | Task 2 form dialog action | Covered by Must-Have #2 fix: explicit useEffect handles both station===null and station!==null |
| 5 | Checkpoint missing regression steps | `checkpoint:human-verify` | Added /vehicles, /vehicle-types, /maintenance navigation steps; added AC-8 delete-RESTRICT deferral note |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | URL-synced filter/search state | MVP back-office tool; filter loss on navigation is low-severity UX issue |
| 2 | `StationStatusBadge` component extraction | Boolean badge doesn't warrant component isolation (unlike 4-value MaintenanceTypeBadge) |
| 3 | ARIA labels for filter controls | Already in STATE.md deferred issues from Phase 1; consistent deferral |

---

## 5. Audit & Compliance Readiness

**Evidence trail**: The human-verify checkpoint produces observable verification of all 10 ACs before SUMMARY is written. The plan does not declare completion autonomously — a human approval gate blocks the SUMMARY step.

**Silent failure prevention**: The `mapSupabaseError` fix (G1) prevents silent misattribution of errors — incorrect Vietnamese messages would confuse operators during incident response. The `Controller` fix (G5) prevents a silent boolean field that always submits `undefined` — which would produce unexpected DB behavior (likely a 23514 CHECK or null insertion failure with no clear error).

**Post-incident reconstruction**: The SUMMARY.md spec at the end of the plan ensures all file changes, decisions, and deviations are documented. The `npm run build` verification step prevents broken builds from reaching the human-verify stage.

**Ownership and accountability**: Human-verify checkpoint with resume-signal ensures a named human approval before loop closes.

**Gaps remaining after audit:**
- AC-8 delete-RESTRICT test deferred to 04-02 (noted in checkpoint). This leaves a partial AC-8 verification gap until routes are seeded.

---

## 6. Final Release Bar

**Must be true before this plan ships:**
1. `npm run build` passes clean (TypeScript + Vite)
2. Human-verify checkpoint passes all AC-1 through AC-10 steps (AC-8 delete-RESTRICT may defer to 04-02 with explicit SUMMARY note)
3. No regressions in /vehicles, /vehicle-types, /maintenance (verified in checkpoint)
4. `mapSupabaseError` returns correct Vietnamese for duplicate name and duplicate code (verified by creating two stations with same name)

**Risks remaining if shipped as-is (after audit):**
- AC-8 delete-RESTRICT cannot be verified until 04-02 seeds routes — low risk, no new code path introduced
- No URL-synced filters — operator must re-apply search/filter after navigation (UX gap, not data integrity gap)

**Sign-off statement:** I would sign my name to this plan as audited. The two release-blocking gaps have been remediated. The five strongly-recommended fixes prevent silent runtime failures that would only surface in UAT.

---

**Summary:** Applied 2 must-have + 5 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
