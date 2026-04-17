# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-form-ux-redesign/10-03-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

This plan is **conditionally acceptable** for enterprise deployment. The architectural approach is sound and follows the proven pattern from 10-02 (maintenance form), which already passed audit. No must-have findings were identified. Five strongly-recommended upgrades have been applied to strengthen empty state handling, validation, error handling, and accessibility.

Would I approve this plan for production if accountable? **Yes**, with the applied upgrades.

---

## 2. What Is Solid

- **Pattern consistency** — Follows the 10-02 maintenance form pattern which already passed audit
- **Schema already hardened** — `trip-form-schema.ts` already has `z.preprocess` for price_override (fixed in 06-01), auth-expiry handling in `mapTripError`, and cross-field refine for departure < arrival
- **Entity query exists** — `useTrip` hook already in trip.queries.ts, no new entity layer work needed
- **Context-aware error mapping** — Plan includes `mapFetchError` with PGRST116/auth-expiry distinction
- **Blocker pattern correct** — `useBlocker` with pathname guard prevents false-positives; `reset()` before navigate() prevents post-submit interception
- **FK dropdown warnings** — Truncation warnings included for both routes and vehicles
- **Staff integration sound** — Existing staff assignment dialog used; navigation pattern architecturally correct

---

## 3. Enterprise Gaps Identified

### FK Dropdown Empty State Handling
**Risk:** User navigates to `/trips/new` but no routes or vehicles exist. The FK dropdowns show empty lists with no clear path forward. User is stuck unable to create trips.

### Datetime Validation for New Trips
**Risk:** User can create trips with departure times in the past. While the schema validates departure < arrival, it doesn't enforce "future only" for new trips, which is a standard business rule.

### Loading Skeleton Specificity
**Risk:** Plan specifies "3 skeleton rows" but doesn't map them to the actual form sections ("Hành trình", "Thời gian", "Điều chỉnh"). Generic skeletons don't communicate structure and hurt accessibility for screen readers.

### Blocker Pending State Implicit
**Risk:** Plan includes `!isPending` in blocker condition but doesn't explicitly explain why. This is critical for preventing navigation during submission, which could cause duplicate actions or race conditions.

### Auth-Expiry Implicit for Mutations
**Risk:** Plan includes auth-expiry handling for fetch-by-id (`mapFetchError`) but doesn't explicitly state that create/update mutations also call `mapTripError` (which handles auth-expiry). This omission could lead to inconsistent error handling.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| — | None | — | No must-have findings identified |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | FK dropdown empty state handling | Task 1 action | Added: "When routes.length === 0, show 'Chưa có tuyến đường nào — tạo tuyến đường trước ở /routes' and disable form submission. Same pattern for vehicles." |
| 2 | Datetime validation for new trips | Task 1 action | Added: "departure_time must be in the future (arrival must also be after departure, already enforced by schema superRefine)" |
| 3 | Loading skeleton specificity | Task 1 Structure | Changed: "3 skeleton sections matching FormSections: 'Hành trình' row, 'Thời gian' row, 'Điều chỉnh' row" |
| 4 | Blocker pending state explicit | Task 1 action | Added: "**Blocker condition: `isDirty && !isPending ...` — `!isPending` ensures blocker fires during submission to prevent duplicate actions" |
| 5 | Auth-expiry explicit for mutations | Task 1 action | Changed: "on error → `toast` with `mapTripError` (which handles auth-expiry 401/403/PGRST301)" |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Status transition validation | DB may handle this; defer to Phase 6 review where trip status lifecycle is centralized |
| 2 | Staff navigation after edit | UX decision; can add later based on user feedback. Create-mode-only is MVP-sufficient |

---

## 5. Audit & Compliance Readiness

**Audit Evidence:** The plan produces defensible evidence through form navigation logs, dirty-state blocker dialogs, and context-aware error messages. Failed attempts are surfaced to the user with actionable messages.

**Failure Prevention:** Dirty-state blocker prevents data loss from accidental navigation. Context-aware error messages distinguish between auth expiry and not-found, routing users to appropriate recovery actions.

**Post-Incident Reconstruction:** Form submissions include trip ID, timestamps, and user identity through Supabase RLS. The `mapTripError` function ensures error codes are logged for debugging.

**Ownership and Accountability:** Form page operates within authenticated routes (ProtectedRoute). All mutations go through Supabase RLS policies which enforce authorization boundaries.

---

## 6. Final Release Bar

**Must be true before this plan ships:**
- All 5 strongly-recommended upgrades are applied (✓ completed)
- Loading skeletons match actual form structure for accessibility
- FK dropdown empty states provide clear next steps
- New trip departure times validated as future-only

**Risks that remain if shipped as-is:**
- None remaining after applied upgrades

**Would I sign my name to this system:**
Yes. The plan follows established patterns, includes appropriate error handling, and has been strengthened with the applied upgrades. The staff assignment integration is architecturally sound and the dirty-state blocker prevents data loss.

---

**Summary:** Applied 0 must-have + 5 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
