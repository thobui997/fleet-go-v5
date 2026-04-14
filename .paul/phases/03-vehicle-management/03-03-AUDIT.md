# Enterprise Plan Audit Report

**Plan:** `.paul/phases/03-vehicle-management/03-03-PLAN.md`
**Audited:** 2026-04-14
**Verdict:** Conditionally acceptable (now ready — 1 must-have + 7 strongly-recommended applied)

---

## 1. Executive Verdict

**Conditionally acceptable.** The CRUD pattern is mature (03-01 and 03-02 established it thoroughly) and the database schema is locked. The plan correctly carries forward the established patterns: FK dropdown with truncation guard, dialog close guard, isError retry state, serializeToInsert null coercion, superRefine cross-field validation.

However, one must-have was found: the `23503` error message was copied verbatim from vehicles — wrong context, wrong message. Maintenance logs have CASCADE delete, so `23503` can only occur on INSERT (non-existent vehicle_id), not on delete. Seven strongly-recommended issues were also applied. Post-remediation, the plan is approvable.

Would I sign my name to this system at this stage? Yes, after the applied fixes.

---

## 2. What Is Solid

- **Entity slice layering:** model/types → api/[name].api → api/[name].queries → index.ts barrel is correctly applied and consistent with the established pattern.
- **CASCADE delete understood correctly:** The plan correctly notes the FK is ON DELETE CASCADE, meaning delete never triggers a 23503 on maintenance_logs. The original plan avoided the trap of mapping this as a delete-restriction error (though it had the wrong message).
- **superRefine cross-field validation:** `next_due_date >= performed_at` is specified correctly, following the established date-ordering pattern from 03-02.
- **Dialog close guard:** Correctly specified for both form and delete dialogs.
- **isError list error state:** Inline error + retry button pattern correctly carried forward.
- **FK dropdown truncation warning:** Pattern correctly referenced with FK_DROPDOWN_PAGE_SIZE.
- **Boundaries:** All completed work explicitly protected. Scope limits are appropriately conservative.
- **Vietnamese i18n:** All error messages, labels, and toasts specified in Vietnamese throughout.

---

## 3. Enterprise Gaps Identified

1. **Wrong 23503 error message** — Vehicles' `mapSupabaseError` maps 23503 to "xe đang được sử dụng" (delete restriction). For maintenance_logs, 23503 can only occur on INSERT with a non-existent vehicle_id. The user would see a misleading "cannot delete: vehicle is in use" message when the actual issue is "the vehicle you selected doesn't exist."

2. **`performed_at` no default in create dialog** — The field is required and DATE_REGEX validated. In create mode, if no `defaultValues` is specified, the field starts empty. The user submits → immediate validation error without touching the date field. UX friction that looks like a bug. DB has `DEFAULT current_date` — the form should match.

3. **Inline `1000` instead of `FK_DROPDOWN_PAGE_SIZE` in list page vehicle filter** — The vehicle filter dropdown in the list page uses `pageSize: 1000` directly. The established pattern uses the named constant for change consistency. If the constant changes in one place, the list filter stays out of sync.

4. **`cost '' → 0` not explicit enough** — `serializeToInsert` for `cost` was mentioned casually as "Cost '' → 0". PostgreSQL's `DEFAULT 0` applies only when the column is omitted from INSERT, NOT when NULL is explicitly passed. If the implementation passes `undefined`, Supabase omits the column (fine). If it passes `null`, the column gets NULL (which fails if there's a NOT NULL constraint, or silently inserts NULL without the default). Explicit coercion to `0` must be stated.

5. **AC-8 doesn't specify the 23503 Vietnamese message** — The acceptance criterion referenced "23503 FK violations" without specifying what the message should be, making it unverifiable.

6. **`npm run build` missing from verify** — `tsc --noEmit` doesn't catch Vite alias resolution failures (`@entities/`, `@pages/`, `@shared/` path aliases). These fail at bundle time. Prior phases encountered this — it should be in the verify step.

7. **Human-verify checkpoint silently skips AC-8 and AC-10** — The checkpoint lists verification steps for AC-1 through AC-7, AC-9, and AC-11 but has no explicit steps for AC-8 (Supabase error mapping) and AC-10 (list error state with retry). These ACs would be unverified in the human checkpoint.

8. **`cost: number` not explicitly typed in MaintenanceLog interface** — The action says "matching all DB columns" without specifying TypeScript type for cost. If ambiguous, an implementer might use `string` (from DB column description) or leave it as `any`. The DataTable uses `toLocaleString('vi-VN')` which requires a number.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| M1 | 23503 error message wrong for maintenance_logs INSERT FK violation context | Task 1 action (mapSupabaseError), AC-8 | Changed 23503 message to "Xe không tồn tại hoặc đã bị xóa"; added explicit note that CASCADE means 23503 cannot occur on delete; removed copied vehicles message |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| S1 | No default value for performed_at in create dialog | Task 1 action (maintenance-form-dialog) | Added defaultValues for create mode: performed_at = today in YYYY-MM-DD format |
| S2 | Inline 1000 instead of FK_DROPDOWN_PAGE_SIZE in list page filter | Task 1 action (maintenance-page) | Changed to FK_DROPDOWN_PAGE_SIZE constant reference |
| S3 | cost '' → 0 coercion not explicit | Task 1 action (serializeToInsert) | Expanded to explicit coercion rule: `!values.cost || values.cost === '' ? 0 : Number(values.cost)` with explanation of why 0 not null |
| S4 | AC-8 doesn't specify the correct 23503 Vietnamese message | AC-8 | Updated to explicitly state "Xe không tồn tại hoặc đã bị xóa" for 23503 on INSERT |
| S5 | npm run build missing from verify | Task 1 verify + verification section | Added `npm run build` after `tsc --noEmit` in both verify block and verification checklist |
| S6 | Human-verify missing AC-8 and AC-10 steps | checkpoint:human-verify | Added step 10 (AC-8 error mapping with fake UUID technique) and step 12 (AC-10 via DevTools network block) |
| S7 | cost typed ambiguously in MaintenanceLog interface | Task 1 action (types.ts) | Specified `cost: number` explicitly with inline note about Supabase numeric return type |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| D1 | performed_at future-date warning | Planned maintenance is expressed via next_due_date; performed_at could legitimately be backdated. Not blocking. |
| D2 | cost Zod max vs DB numeric(12,2) max mismatch | Plan's max(999_999_999.99) is more conservative than DB max (9,999,999,999.99). Conservative validation is acceptable. |
| D3 | odometer cross-field validation vs vehicle current_mileage | Requires fetching vehicle data in form — scope creep. Domain validation only, not safety-critical. |
| D4 | Description text search filter | MVP scope is vehicle and type filters only. Useful but not blocking. |
| D5 | Next due date overdue visual indicator | UI polish, not functionality. Phase 8 analytics is the appropriate home. |
| D6 | Server-side sort for columns other than performed_at | Client-side DataTable sorting sufficient for MVP. Consistent with boundaries. |

---

## 5. Audit & Compliance Readiness

**Evidence production:** The entity layer produces structured data; DataTable provides visual audit of all logs. No audit-trail columns (created_by/updated_by) on maintenance_logs — this is an existing gap noted in 03-02 and deferred to a schema-delta plan.

**Silent failures:** The list error state (AC-10) and error mapping (AC-8) prevent silent data loss from the user's perspective. The `cost: 0` default prevents silent null insertions.

**Post-incident reconstruction:** performed_at + vehicle_id + type + description provide adequate reconstruction context. updated_at trigger (set_maintenance_logs_updated_at) provides modification timestamps.

**Ownership:** RLS policies require maintenance:write for mutations and is_admin() for hard deletes — clear access control.

**Audit gap remaining:** No created_by/updated_by on maintenance_logs — flagged in 03-02, still unresolved. Material gap for SOC 2 but deferred (schema-delta plan needed before GA).

---

## 6. Final Release Bar

**Must be true before shipping:**
- 23503 error message shows INSERT-FK context, not delete-restriction language ✓ (applied)
- `performed_at` defaults to today in create dialog ✓ (applied)
- `cost` typed as `number` in interface ✓ (applied)
- `npm run build` passes ✓ (added to verify)

**Risks if shipped as-is (pre-audit):**
- Fleet managers see "cannot delete: vehicle is in use" when trying to create a log with a stale vehicle selection — confusing and misleading
- Create dialog forces users to manually type today's date on every new log entry — UX friction
- TypeScript types for cost potentially incorrect — silent runtime error in cost formatting

**Remaining risks post-audit:**
- No created_by/updated_by audit trail (known deferred gap from 03-02)
- No overdue next_due_date highlighting (deferred to Phase 8)

**Sign-off:** Post-remediation, this plan is approvable for the described MVP scope.

---

**Summary:** Applied 1 must-have + 7 strongly-recommended upgrades. Deferred 6 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
