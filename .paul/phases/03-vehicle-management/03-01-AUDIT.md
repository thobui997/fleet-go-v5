# Enterprise Plan Audit Report

**Plan:** .paul/phases/03-vehicle-management/03-01-PLAN.md
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (now ready after applying upgrades)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is well-structured with correct FSD layering, appropriate scope boundaries, and good use of existing shared components. However, it had two release-blocking gaps: (1) no handling for the UNIQUE constraint on `vehicle_types.name`, and (2) raw Supabase error messages leaking to users. Both are now addressed. After applying 2 must-have + 4 strongly-recommended upgrades, I would approve this plan for production.

---

## 2. What Is Solid

- **FSD layering is correct.** Entity (types + API + hooks) in `entities/`, page composition in `pages/`, no features layer needed for simple CRUD. This sets a clean precedent for subsequent phases.
- **TanStack Query cache invalidation strategy is sound.** Invalidating `['vehicle-types']` on all mutations ensures list consistency without optimistic updates (appropriate for an admin tool with low concurrency).
- **Boundaries are well-defined.** Explicit DO NOT CHANGE list protects Phase 1/2 artifacts. Scope limits are clear and justified.
- **Checkpoint placement is correct.** Single human-verify at the end, not after every task. Avoids verification fatigue while still catching first-feature-module issues visually.
- **Database schema integration is accurate.** Plan correctly references RESTRICT FK semantics for delete, and properly uses existing `{ count: 'exact' }` and `.range()` Supabase patterns.
- **JSON textarea for seat_layout is the right MVP call.** A visual editor would be scope creep at this stage.

---

## 3. Enterprise Gaps Identified

### 3.1 UNIQUE constraint on name not handled (release-blocking)
`vehicle_types.name` is `text NOT NULL UNIQUE`. Create and update operations can fail with PostgreSQL error 23505 (unique_violation). The original plan had no acceptance criteria or error handling for this scenario. Users would see a raw database error on a very common user mistake (reusing a name).

### 3.2 Raw Supabase error messages exposed to users (release-blocking)
The original plan said "Show error toast on failure (include Supabase error message)." In enterprise software, raw PostgreSQL error strings must never reach users. They are: (a) not actionable, (b) leak implementation details, (c) fail accessibility (often English-only when the app is Vietnamese).

### 3.3 Vietnamese validation messages missing
The existing login form uses Vietnamese Zod messages. The plan's Zod schema had no language specification, which would result in English-only messages — inconsistent with the established pattern.

### 3.4 DataTable ColumnDef constraint incompatible with actions column
The `ColumnDef<TData>` interface requires `key: keyof TData & string`. An "actions" column with an arbitrary key would fail TypeScript. The plan needed explicit implementation guidance for how to add a non-data column within this constraint.

### 3.5 Edit pre-fill: object → string serialization unspecified
The seat_layout is stored as a JSONB object in Supabase but the form uses a string textarea. Edit mode requires `JSON.stringify()` to serialize back. Amenities similarly need array→string joining. Without explicit guidance, the implementer might pass an object to a string field.

### 3.6 Seat layout Zod validation too loose
"Valid JSON object" permits `{}` or `{"x": 1}`. While we're not enforcing a full seat layout schema (that's the visual editor's job), an empty object or arbitrary keys provide zero value. Minimum validation: non-null, non-array object with at least one key.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Duplicate name constraint error not handled | acceptance_criteria, Task 2c (form dialog) | Added AC-6 (duplicate name → mapped error, form stays open). Updated form dialog action to call mapSupabaseError and keep dialog open on 23505. |
| 2 | Raw Supabase errors exposed to users | acceptance_criteria, Task 2a (schema), Task 2c (form), Task 2d (delete) | Added AC-7 (all mutations use mapped errors). Added mapSupabaseError helper to form schema file. Replaced "include Supabase error message" with "call mapSupabaseError" in both form and delete dialogs. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 3 | Vietnamese validation messages missing | Task 2a (Zod schema) | Added Vietnamese messages for all Zod validators matching login-schema.ts pattern. |
| 4 | DataTable actions column ColumnDef incompatibility | Task 2b (list page) | Added explicit guidance: use `key: 'id'` with `header: ''` and custom cell renderer for DropdownMenu actions. |
| 5 | Edit pre-fill serialization unspecified | Task 2c (form dialog) | Added explicit `JSON.stringify(vehicleType.seat_layout, null, 2)` for edit mode and `.join(', ')` for amenities. |
| 6 | Seat layout Zod validation too loose | Task 2a (Zod schema) | Strengthened `.refine()` chain: parse JSON → typeof object → not null → not array → at least one key. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Permission-gated UI (hide/show Add/Edit/Delete based on role) | Explicitly deferred in plan scope limits. Cross-cutting concern across all phases — better addressed as a dedicated plan after all CRUD modules exist. RLS still enforces server-side. |
| 2 | URL-synced pagination/search state (deep linking) | Nice-to-have for bookmarking filtered views. Not required for admin tool MVP. |
| 3 | Server-side sorting | Explicitly deferred. Client-side sort is acceptable for the expected data volume (<1000 vehicle types). |
| 4 | Seat layout structural schema validation | A full schema (floors must be arrays of rows, rows must contain seat objects, etc.) requires the visual editor to define the canonical format. Premature to lock down now. Non-empty object validation is sufficient for MVP. |

---

## 5. Audit & Compliance Readiness

**Audit evidence:** The plan produces standard CRUD with TanStack Query — all mutations go through Supabase RLS. The existing RLS policies (Phase 2) enforce write-requires-permission and delete-requires-admin. The plan doesn't bypass any of these controls.

**Silent failure prevention:** After upgrades, all Supabase errors are caught and mapped to user-visible messages. The `throw on error` addition to API functions ensures TanStack Query's error state is always populated — no silent swallowed failures.

**Post-incident reconstruction:** Supabase provides built-in audit logging for all database operations. The `created_at`/`updated_at` columns (auto-managed by triggers) provide temporal audit trail. No additional application-level logging is needed for this CRUD module.

**Ownership:** FSD structure enforces clear ownership — `entities/vehicle-type/` owns the data contract, `pages/vehicle-types/` owns the UI. No ambiguity.

---

## 6. Final Release Bar

**What must be true before this ships:**
- All 7 acceptance criteria (AC-1 through AC-7) pass
- No raw PostgreSQL error strings visible in any failure path
- Vietnamese validation messages consistent with login form
- TypeScript compiles without errors
- Human verification checkpoint passes (visual + functional)

**Remaining risks if shipped as-is:**
- No permission-gated UI means all authenticated users see Add/Edit/Delete buttons. RLS will reject unauthorized writes, but users see an error instead of hidden buttons. Acceptable for internal admin tool; must address before external deployment.
- Seat layout JSON has minimal validation. Users can store semantically meaningless objects. Risk is low — only admin users with `vehicle_types:write` can submit, and the visual editor in a future phase will retroactively constrain the format.

**Sign-off:** After the applied upgrades, I would sign my name to this plan. The remaining deferrals are justified and tracked.

---

**Summary:** Applied 2 must-have + 4 strongly-recommended upgrades. Deferred 4 items.
**Plan status:** Updated and ready for APPLY.

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
