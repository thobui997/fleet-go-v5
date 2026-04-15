# Enterprise Plan Audit Report

**Plan:** .paul/phases/04-route-station-management/04-02-PLAN.md
**Audited:** 2026-04-15
**Verdict:** Conditionally acceptable (now ready after fixes applied)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is well-structured and follows the established FSD patterns, PostgREST join syntax, FK dropdown pattern, and dialog lifecycle management correctly. Two must-have defects would cause silent data corruption or misleading error messages in production. Four strongly-recommended items address correctness gaps that would surface as confusing UX. All have been applied. The plan is now ready for APPLY.

Would I sign off on this before fixes? No — the `parseDurationMinutes` fallback-to-zero is a latent DB constraint violation path and the 23503 message conflation is a product-quality failure. After fixes: yes.

---

## 2. What Is Solid

- **PostgREST FK join syntax** — correct constraint name references (`routes_origin_station_fk`, `routes_destination_station_fk`) match the migration exactly. Many plans get this wrong.
- **TanStack Query cache deduplication** — calling `useStations` twice with identical params correctly collapses to one network request. The note about this is accurate and prevents unnecessary double fetching.
- **Cross-field Zod `superRefine`** — `origin_station_id !== destination_station_id` validation at the form layer mirrors the DB CHECK `routes_different_origin_destination`. Defense-in-depth without relying solely on the DB.
- **`serializeToInsert` interval format** — `"HH:MM:SS"` is valid PostgreSQL interval syntax accepted by PostgREST. Clean and unambiguous.
- **`useEffect` reset pattern** — explicit `[open, mode, route, reset]` dependencies prevent stale form state between open/close cycles. Mirrors the audited 04-01 pattern.
- **Dialog close guard** — `if (!nextOpen && isPending) return` prevents accidental double-submits during mutation flight.
- **Boundaries section** — explicitly prohibits modifying `@entities/station`, migrations, and `@shared/ui`. Protects 04-01 work.

---

## 3. Enterprise Gaps Identified

### Gap 1: `parseDurationMinutes` fallback=0 causes silent DB constraint violation [MUST-HAVE]
The plan specified "Falls back to 0 if parsing fails." A parse failure on edit returns `0`, which the form displays as 0 minutes. If the user saves without noticing, `serializeToInsert` produces `"00:00:00"`, which violates the DB CHECK `routes_duration_positive CHECK (estimated_duration > '0'::interval)`. The DB rejects it with code 23514, which previously fell through to the generic "Thao tác thất bại" message. The user has no idea why saving failed. Additionally, the original parser only handled "HH:MM:SS" — PostgreSQL returns "X days HH:MM:SS" for durations ≥ 24h (e.g., overnight sleeper coach routes). This would parse incorrectly, producing a wrong minute count and silently corrupting the stored duration.

### Gap 2: `mapSupabaseError` 23503 conflated across operation contexts [MUST-HAVE]
The single `mapSupabaseError` function maps all 23503 errors to the delete-context message "Không thể xóa tuyến đường đang được sử dụng bởi chuyến đi." However, 23503 can fire on `createRoute` or `updateRoute` if a station FK is invalid (race condition: user loads dropdown, station is deleted by another admin session, user submits). Showing a "cannot delete" message when a create/update operation failed is a product-quality failure — it is categorically wrong and will confuse support teams and users during incident investigation.

### Gap 3: 23514 (DB CHECK) not mapped [STRONGLY RECOMMENDED]
The routes table has five CHECK constraints (`routes_distance_positive`, `routes_base_price_non_negative`, `routes_different_origin_destination`, `routes_name_not_empty`, and `routes_duration_positive`). If any fires — including from the duration fallback bug before this audit fixed it — the error code 23514 falls through to the generic default. `station-form-schema.ts` (established in 04-01) maps 23514. This plan should match.

### Gap 4: `serializeToInsert` no defensive minimum clamp [STRONGLY RECOMMENDED]
Even with Zod validation enforcing `.positive()`, a defensive `Math.max(1, minutes)` in the serializer provides a second line of defense against "00:00:00" reaching the DB. Zod can be bypassed (direct API calls, future refactors that reuse `serializeToInsert` without the Zod schema). Belt-and-suspenders for a constraint that causes a user-visible error.

### Gap 5: Route type collision underspecified [STRONGLY RECOMMENDED]
The plan noted "avoid the import" for `Route` from react-router-dom but left the resolution vague. In `router.tsx`, any transitive import of the entity `Route` type alongside react-router-dom types could cause silent shadowing. The resolution needs to be explicit: don't import entity types in `router.tsx`; alias as `RouteRecord` in files where both are needed.

### Gap 6: Human-verify checkpoint missing `npm run build` [STRONGLY RECOMMENDED]
Step 12 of the checkpoint asks for `npx tsc --noEmit`. TypeScript type-checking does not catch Vite-specific build issues (dynamic import resolution, asset pipeline, plugin transforms). `npm run build` was correctly included in Task 2's `<verify>` but omitted from the human-verify checkpoint. The human-verify checkpoint is what the user actually runs — it must be complete.

---

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | `parseDurationMinutes` fallback=0 causes DB CHECK violation; only handles "HH:MM:SS" format | Task 2 action — `parseDurationMinutes` | Fallback changed to `1` (minimum valid); multi-day "X days HH:MM:SS" format added; explicit note that 0 must never reach DB |
| 2 | `mapSupabaseError` 23503 message wrong on INSERT/UPDATE context | Task 2 action — `mapSupabaseError`; AC-6 | Added `context?: 'mutate' \| 'delete'` param; 23503+mutate → "Trạm không tồn tại hoặc đã bị xóa"; 23503+delete → existing delete message; call sites specified |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | 23514 DB CHECK not mapped | Task 2 action — `mapSupabaseError`; AC-6 | Added `23514 → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"` to match station-form-schema.ts pattern |
| 2 | No defensive minimum clamp in `serializeToInsert` | Task 2 action — `serializeToInsert` | Added `Math.max(1, values.estimated_duration_minutes)` before interval serialization |
| 3 | Route type collision underspecified | Task 2 action — Avoid section | Explicit resolution: no entity type imports in `router.tsx`; alias `RouteRecord` in any file needing both |
| 4 | Human-verify checkpoint missing `npm run build` | Checkpoint `how-to-verify` | Added step 13: `npm run build` completes without errors |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|------------------------|
| 1 | Permission-gated UI (hide create/edit/delete for read-only roles) | Dynamic role system not yet implemented (Phase 5). All current users are admins. Deferred from earlier audits consistently. |
| 2 | URL-synced filters (page, search, status in query params) | Browser back-navigation is not a stated requirement. Consistent with 04-01 deferral. |
| 3 | Server-side sorting | DataTable handles client-side sort on current page. Acceptable for MVP data volumes. |
| 4 | `formatDuration` should handle ISO 8601 intervals (e.g., "PT2H30M") | PostgREST in the Supabase version used by this project returns "HH:MM:SS" format, not ISO 8601. If Supabase upgrades PostgREST, revisit. |
| 5 | Optimistic concurrency (updated_at check on UPDATE) | No stated requirement for multi-user concurrent edit detection at MVP stage. |

---

## 5. Audit & Compliance Readiness

**Error traceability:** After fixes, all DB error codes (23503, 23505, 23514, auth errors) produce Vietnamese user-facing messages that distinguish the failure mode. Errors do NOT surface raw Supabase error objects. Compliant.

**Silent failure prevention:** The `parseDurationMinutes` fallback-to-0 fix prevents a silent data corruption path. The `Math.max(1, minutes)` clamp adds a second gate. The 23514 mapping ensures DB CHECK violations surface as intelligible messages rather than generic fallbacks.

**Post-incident reconstruction:** The `mapSupabaseError` context param means support staff can determine from the error message whether a 23503 was a create/update race condition or a delete RESTRICT. Without context, both look identical in logs.

**Audit trail:** No write-audit columns (created_by/updated_by) on the routes table — flagged as a compliance gap in prior audits (03-02) and deferred to a future schema-delta plan. This remains an open item.

**Ownership:** Clear — single entity slice owner, single page slice owner. Boundaries protect completed 04-01 work.

---

## 6. Final Release Bar

**What must be true before this plan ships (now satisfied after fixes):**
- `parseDurationMinutes` returns minimum `1` on failure, handles multi-day format
- `mapSupabaseError` distinguishes 23503 by operation context
- 23514 mapped in both form and delete dialog paths
- `serializeToInsert` clamps to minimum 1 minute

**Remaining risks if shipped as-is after fixes:**
- Multi-user concurrent edit: last-write-wins (no optimistic locking). Acceptable at MVP scale.
- Station dropdown truncation warning is informational only — if a fleet has >1000 stations, only 1000 show. Unlikely at MVP.

**Sign-off:** Yes, conditionally. The two must-have defects and four strongly-recommended items have been applied to the plan. The plan is now enterprise-appropriate for the current MVP phase.

---

**Summary:** Applied 2 must-have + 4 strongly-recommended upgrades. Deferred 5 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
