# Enterprise Plan Audit Report

**Plan:** .paul/phases/10-form-ux-redesign/10-05-PLAN.md
**Audited:** 2026-04-17
**Verdict:** Conditionally acceptable (now ready)

---

## 1. Executive Verdict

This plan is **conditionally acceptable** for execution. The plan structure is solid, following established patterns from prior phase 10 plans. However, **3 must-have and 3 strongly-recommended** upgrades are required to bring it to enterprise-grade standards.

**Critical issues:**
1. A typo in error text would be embarrassing in production ("đăng hát" instead of "đăng nhập")
2. FK dropdown empty states are unhandled — users can submit with empty stations causing FK violations
3. The `saveAndStops` state variable is referenced but not explained

After applying the automated upgrades, the plan is ready for APPLY.

---

## 2. What Is Solid

- **Clear 3-task structure** with specific files and responsibilities
- **Follows established patterns** from 10-02 (MaintenanceFormPage), 10-03 (TripFormPage + sub-page), and 10-04 (EmployeeFormPage)
- **Proper boundaries** protecting entity layer — no schema changes, no new dependencies
- **Reuses existing form schemas** without modification — reduces risk
- **Task 1 correctly specifies** useBlocker, hasInitializedRef, mapFetchError, loading skeleton, error state
- **Task 2 correctly preserves** SortableStopRow at module level (critical for DnD stability per 04-03 audit)
- **Task 3 has proper route ordering** comments (literal segments before dynamic)
- **Build verification** included in tasks

---

## 3. Enterprise Gaps Identified

### Must-Have (Release-Blocking)

1. **Typo in mapFetchError (Task 1):** "Phiên đăng **hát** nhập" is a copy-paste error that would ship to production. This is basic correctness.

2. **FK dropdown empty state unhandled (Task 1):** The plan specifies FK dropdowns for origin/destination stations but doesn't say what happens when the stations array is empty. Users can click submit with empty selections, causing PostgreSQL FK violation (23505) with a generic error. This violates the established pattern from 10-03/10-04 where FK dropdown empty states disable the submit button.

3. **saveAndStops state undefined (Task 1):** The submit handler says "if saveAndStops" but the plan never explains where this state variable comes from. In TripFormPage (10-03), there's an explicit `setSaveAndAssign(true)` on the "Lưu & Phân công" button. This is underspecified.

### Strongly Recommended

1. **FK dropdown truncation warning missing (Task 1):** The plan uses `FK_DROPDOWN_PAGE_SIZE = 1000` but doesn't specify the truncation warning pattern established in 10-02/10-03/10-04. When `count > data.length`, users should see "Hiển thị X / Y trạm. Liên hệ quản trị viên nếu không thấy trạm cần chọn."

2. **RouteStopsPage mapFetchError missing (Task 2):** StaffAssignmentPage (10-03) has an inline `mapFetchError` function for the `useTrip` fetch. The plan says to use `useRoute(id)` but doesn't specify the error handling function. This is inconsistent with the reference pattern.

3. **Auth-expiry not explicit for RouteStopsPage (Task 2):** The plan says to port error handling from RouteStopsDialog, but the existing `mapRouteStopError` already handles auth-expiry. The audit on 10-03/10-04 emphasized being explicit about auth-expiry handling for mutations. The plan should clarify this is preserved.

### Deferred

None — all findings are applicable to this plan.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Typo "đăng hát nhập" → "đăng nhập" | Task 1, action item 2 | Fixed typo with audit-added comment |
| 2 | FK dropdown empty state handling | Task 1, action item 3 | Added empty state message and submit disable logic |
| 3 | saveAndStops state not explained | Task 1, action item 3 | Added useState declaration and button onClick pattern |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | FK dropdown truncation warning | Task 1, action item 3 | Added AlertTriangle warning when count > data.length |
| 2 | RouteStopsPage mapFetchError missing | Task 2, action item 1 | Added AlertCircle, Skeleton to imports; action item 4 added inline function |
| 3 | Auth-expiry explicit for mutations | Task 2, action item 3 | Added auth-expiry explicit note for useSaveRouteStops |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| (none) | — | All findings applicable to this plan |

---

## 5. Audit & Compliance Readiness

**Evidence Production:** ✅ Acceptance criteria are testable (Given/When/Then). Build verification catches TypeScript errors.

**Failure Prevention:** ✅ useBlocker prevents data loss. FK empty states prevent constraint violations. Error states are explicit with recovery actions.

**Post-Incident Reconstruction:** ✅ Context-aware error mapping (PGRST116 vs auth-expiry) produces defensible logs. Navigation patterns are documented.

**Ownership & Accountability:** ✅ Clear task ownership. Files modified are explicit. Verification checklist includes regression testing.

---

## 6. Final Release Bar

**Before this plan ships:**
1. All 3 tasks must be completed
2. Build must pass with zero errors
3. FK dropdown empty state must disable submit
4. "Lưu & Điểm dừng" button must navigate correctly after creation
5. RouteStopsPage must preserve DnD functionality

**Remaining risks (acceptable):**
- RouteStopsDialog and RouteFormDialog are kept for safety — minor code duplication acceptable for rollback safety
- ARIA attributes on dirty-state dialog deferred from 10-02 audit — acknowledged gap for regulated deployment

**Sign-off statement:**
I would approve this plan for production after the applied upgrades. The plan follows established patterns, has clear verification steps, and now handles FK empty states correctly. The typo fix prevents an embarrassing production error.

---

**Summary:** Applied **3 must-have** + **3 strongly-recommended** upgrades. Deferred **0** items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
