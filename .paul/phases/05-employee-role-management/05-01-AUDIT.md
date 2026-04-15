# Enterprise Plan Audit Report

**Plan:** .paul/phases/05-employee-role-management/05-01-PLAN.md
**Audited:** 2026-04-15
**Verdict:** Conditionally acceptable (now ready after fixes applied)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is structurally sound — correct FSD layering, accurate constraint names, CASCADE behavior correctly identified, established dialog patterns properly carried forward. However, three defects would cause silent misclassification of errors in production and one UX gap left a testable behavior undefined. After applying 1 must-have and 5 strongly-recommended fixes, the plan is ready for APPLY.

Would I approve this for production after fixes? **Yes.**

---

## 2. What Is Solid

- **`roles_name_key` named explicitly** in mapRoleError — not a generic "duplicate" catch. Correct constraint targeting per established codebase pattern.
- **CASCADE behavior surfaced to user** — the delete dialog warning correctly explains that user_roles entries are automatically removed. Most plans ignore cascades entirely.
- **Dialog close guard during `isPending`** — carried forward from 03-02. Prevents double-submission on slow connections.
- **`useEffect` reset on `[open, role]`** — correct for this form. Unlike route stops (04-03), role permissions come directly from the prop, so no hasInitializedRef race condition exists.
- **`autonomous: false` + checkpoint after implementation** — correctly placed. Human verification before phase close.
- **Permissions chip editor scoped to plain strings, no external library** — pragmatic MVP boundary that avoids dependency bloat.
- **Inline error state on list** — `isError → error + retry` instead of empty table; carried forward consistently.

---

## 3. Enterprise Gaps Identified

| # | Gap | Severity | Risk |
|---|-----|----------|------|
| 1 | `mapRoleError` fallback `msg.includes('23505') && msg.includes('name')` matches any 23505 with "name" in message | **Must-have** | Silent misclassification of unrelated constraint violations |
| 2 | `fetchRoles` search passed to ilike without `.trim()` | Strongly recommended | Whitespace-only queries return zero results silently; user confusion |
| 3 | `z.array(z.string())` allows empty/whitespace permission strings | Strongly recommended | Invalid permission strings reach DB if chip UI guard is bypassed |
| 4 | AC-3 edit success has no toast specified | Strongly recommended | Testable UX behavior left undefined; inconsistent with AC-2 |
| 5 | No auth-expiry path (PGRST301/401/403) in mapRoleError | Strongly recommended | Session-expiry silently shows generic error instead of actionable message |
| 6 | 23514 CHECK constraint violation not handled | Strongly recommended | `permissions` has `jsonb_typeof = 'array'` CHECK; violation falls to generic fallback |
| 7 | Checkpoint missing regression verification | Strongly recommended | No confirmation that prior phases (/vehicles, /stations) still function after router change |

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `mapRoleError` fallback `(msg.includes('23505') && msg.includes('name'))` is too broad | Task 2 action — `mapRoleError` | Replaced with `details?.includes('(name)')` using Supabase PostgrestError `.details` field; also restructured to access `.code`, `.message`, `.details` from typed error object |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Search input not trimmed before ilike | Task 1 action — `fetchRoles` | Added `const q = (search ?? '').trim()` with explicit comment on silent-zero-result risk |
| 2 | Zod permissions array allows empty/whitespace strings | Task 2 action — `roleFormSchema` | Added `.min(1)` + `.regex(/^\S+$/)` on each permission string element |
| 3 | AC-3 edit success toast unspecified | AC-3 | Added `And a success toast shows "Cập nhật vai trò thành công"` |
| 4 | No auth-expiry path in mapRoleError | Task 2 action — `mapRoleError` | Added `PGRST301 / 401 / 403` → "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" |
| 5 | 23514 CHECK constraint not handled | Task 2 action — `mapRoleError` | Added `code === '23514'` → "Dữ liệu quyền không hợp lệ, vui lòng thử lại" |
| 6 | Checkpoint missing regression verification | checkpoint:human-verify | Added step 10: verify /vehicles and /stations load without errors |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| 1 | Delete dialog: show count of users affected by cascade | Requires extra query to count user_roles rows; generic cascade warning is sufficient for MVP. Deferred to future UX enhancement. |
| 2 | Permission string autocomplete / preset list | Plan explicitly scopes this out. No business requirement for autocomplete at MVP stage. |
| 3 | Individual permission string max length (e.g. 100 chars) | Unrealistic to exceed in practice; DB has no constraint; deferred. |
| 4 | Permission-gated UI (hide/show actions based on user role) | Phase-level deferred item; needs auth context refactor. |

---

## 5. Audit & Compliance Readiness

**Evidence production:** The `<verification>` checklist includes type-checking (`tsc -b`) and build (`npm run build`) plus human-verified AC sign-off. This is sufficient for the MVP phase.

**Silent failure prevention:** MH-1 fix eliminates the primary silent misclassification risk. SR-3 ensures auth expiry is actionable rather than opaque. SR-2 closes the gap where whitespace-only queries could silently return empty results.

**Post-incident reconstruction:** No server-side logging is introduced (outside scope for a frontend CRUD plan). This is an accepted gap for MVP; addressed by Supabase's native PostgREST logging.

**Ownership:** The `mapRoleError` function is local to the roles page module, which is the correct FSD placement (not a shared utility). Each module owns its error vocabulary.

**One structural note:** The JSONB permissions field (`["vehicles:read", "vehicles:write"]`) is a security-adjacent construct — roles govern access control. The plan correctly treats this as data CRUD, not role enforcement (enforcement is in Supabase RLS, not the React UI). The boundary is clean.

---

## 6. Final Release Bar

**Must be true before this plan ships:**
- `mapRoleError` uses `.details?.includes('(name)')` not `msg.includes('name')` — applied ✓
- Permission strings in Zod validated for non-empty and no whitespace — applied ✓
- Auth-expiry errors produce actionable message — applied ✓

**Risks remaining after fixes:**
- Role names are the only unique constraint; no slugification or normalization. Case-sensitive uniqueness means "Admin" and "admin" are distinct roles. This is a DB behavior (enforced by PostgreSQL's default case-sensitive collation), not a plan gap.
- Permissions are free-form strings. An admin could create a role with `["*"]` (wildcard) — this is intentional and matches the seed data. The plan does not need to prevent this.

**Sign-off:** With the 1 must-have + 5 strongly-recommended fixes applied, this plan is defensible for production use at MVP scale.

---

**Summary:** Applied 1 must-have + 5 strongly-recommended upgrades. Deferred 4 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
