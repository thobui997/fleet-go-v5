# Enterprise Plan Audit Report

**Plan:** .paul/phases/06-trip-scheduling/06-02-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

**Conditionally acceptable — approved after auto-applied fixes.**

The core architecture is sound: entity slice follows established FSD patterns, conflict detection is well-layered (client-side advisory + DB hard limits), and error mapping covers the right SQLSTATE codes. The one must-have fix addresses a field-level bug in the error mapper that would have caused all 23505 errors to fall through to the generic message. The strongly-recommended items improve UX robustness (loading states, read-only guards, state reset).

I would approve this plan for execution after the auto-applied fixes.

## 2. What Is Solid

- **Entity slice pattern**: Follows established FSD model→api→queries→index pattern. No deviation.
- **trip_staff schema leverage**: Correctly uses existing DB constraints (composite PK for dedup, partial unique index for driver limit). No new migrations needed.
- **Conflict detection approach**: Client-side advisory check + DB hard limits is the right layering. Advisory warnings allow dispatchers to override for edge cases; DB constraints catch the hard limits.
- **Error mapping coverage**: Covers 23505 (two variants), 23503, and auth expiry. All relevant SQLSTATE codes for trip_staff operations.
- **Boundaries**: Correctly protects all stable entity slices and the locked schema.
- **Scope limits**: Appropriately excludes batch assignment, DnD ordering, role editing, and calendar view.
- **FK dropdown pattern**: Uses established FK_DROPDOWN_PAGE_SIZE + is_active filter for employee dropdown.

## 3. Enterprise Gaps Identified

1. **Error mapper constraint discrimination uses wrong field** (Must-have): The plan specifies `details includes 'trip_staff_pkey'` but the PostgreSQL constraint name is in the `message` field, not `details`. The `details` field contains key/value pairs like `Key (trip_id, employee_id)=(...) already exists.` — it does NOT contain the constraint name. Checking `details.includes('trip_staff_pkey')` would never match, causing both 23505 variants to fall through to the generic error message.

2. **No driver-already-exists pre-check** (Strongly-recommended): When user selects 'driver' role, the only feedback for "trip already has a driver" is a post-DB-insert error toast. A pre-check against the already-loaded staff list would provide immediate feedback before the user clicks "Add".

3. **No read-only guard for completed/cancelled trips** (Strongly-recommended): Adding or removing staff on a completed or cancelled trip is semantically incorrect. The dialog should disable add/remove controls for non-editable trip statuses.

4. **No state reset on trip change** (Strongly-recommended): If user opens dialog for trip A, selects an employee, closes, then opens for trip B, the selectedEmployeeId and selectedRole from trip A persist. Stale state could cause confusion or accidental assignments.

5. **No loading state for staff list** (Strongly-recommended): When dialog opens, useTripStaff fires but the plan doesn't account for the loading period. User would see the empty state "Chưa phân công nhân viên" flash before data loads, which could be confusing for trips with existing staff.

6. **No confirmation for driver removal** (Can safely defer): Removing a driver leaves a trip without required crew. A confirmation dialog would be better, but toast-based feedback is acceptable for MVP since the action is easily reversible (re-add the driver).

7. **Employee name fallback for null profiles** (Can safely defer): If an employee has no linked profile, `profiles?.full_name` would be blank. Should show a fallback identifier. Low risk since employees are created with user_id → profiles link.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Error mapper checks `details` instead of `message` for constraint name | Task 2, action item 6 | Changed `details includes` → `message includes` for both 23505 discrimination checks. Added `<!-- audit-added -->` comment. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Driver-already-exists pre-check | Task 2, action item 5 | Added inline check: when selectedRole is 'driver' and staff list already has a driver, show warning immediately. |
| 2 | Read-only mode for completed/cancelled trips | Task 2, action item 9 | Added: hide add/remove controls, show read-only staff list with status notice when trip is completed/cancelled. |
| 3 | Reset state on trip change | Task 2, action item 8 | Added: useEffect on trip?.id to reset selectedEmployeeId and selectedRole. Prevents stale state. |
| 4 | Staff list loading state | Task 2, action item 3 | Added: show loading spinner/skeleton while useTripStaff is fetching. |
| 5 | Regression steps in checkpoint | Checkpoint, steps 10-11 | Added regression verification steps for read-only mode and state reset. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Confirmation dialog for driver removal | Action is easily reversible (re-add driver). Toast feedback sufficient for MVP. |
| 2 | Employee name fallback for null profiles | Low probability: employees created with user_id → profiles link. Can address if edge case reported. |

## 5. Audit & Compliance Readiness

**Strengths:**
- DB constraints enforce hard limits (composite PK, partial unique index) — data integrity is guaranteed regardless of client behavior
- Error mapping uses SQLSTATE codes (machine-classifiable) not message string parsing
- Conflict validation is layered: client advisory + DB enforcement

**Remaining considerations:**
- No audit trail for staff assignments (who assigned/removed staff, when). The trip_staff table has created_at/updated_at but no `created_by`/`updated_by` columns. This is a known project-wide gap (flagged in 03-02 audit) deferred to a future schema-delta plan.
- Conflict validation is client-side only and advisory. A determined user or race condition could result in overlapping assignments. For MVP this is acceptable; a server-side RPC check would be needed for strict enforcement.

## 6. Final Release Bar

**Must be true before shipping:**
- Must-have #1 applied: error mapper uses `message` not `details` for constraint discrimination
- All strongly-recommended items applied to plan
- npm run build passes
- Human-verify checkpoint passes

**Risks remaining after ship:**
- Client-side conflict check has inherent race condition window (low impact: DB catches hard limits)
- No server-side overlap enforcement (advisory only)
- No created_by/updated_by audit trail on trip_staff (project-wide deferred gap)

**Sign-off:** I would approve this plan for execution with the applied fixes. The architecture is sound and the remaining risks are acceptable for MVP.

---

**Summary:** Applied 1 must-have + 4 strongly-recommended upgrades. Deferred 2 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
