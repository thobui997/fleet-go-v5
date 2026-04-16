# Enterprise Plan Audit Report

**Plan:** .paul/phases/07-customer-ticketing-payment/07-01-PLAN.md
**Audited:** 2026-04-16
**Verdict:** Conditionally acceptable (upgrades applied, now ready)

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is well-structured, follows established FSD patterns consistently, and has clear acceptance criteria. The primary risks are data integrity gaps around UNIQUE nullable columns (email, id_card_number) and missing input normalization (phone_number trim). These are the same class of issues caught in prior audits (03-02 license_plate, 04-01 station name). All must-have and strongly-recommended findings have been applied.

## 2. What Is Solid

- **Entity slice structure** — Follows station entity pattern exactly. Types, API, queries, and public API exports are well-defined.
- **Error handling architecture** — mapSupabaseError with constraint-specific 23505 discrimination by constraint name in `message` field (consistent with 06-02 audit finding). Auth-expiry handling (401/403/PGRST301) included.
- **hasInitializedRef pattern** — Prevents background refetch from overwriting unsaved edits. Correctly adopted from prior phases.
- **Radix Select __none__ sentinel** — Correctly documented for nullable Select fields.
- **Boundaries section** — Explicitly protects schema, routes config, sidebar, and other entity slices.
- **Router integration** — Minimal change (replace placeholder, add import). Routes and sidebar already exist.
- **AC structure** — 8 acceptance criteria covering CRUD, errors, validation, duplicates, and routing. Well-scoped Given/When/Then format.

## 3. Enterprise Gaps Identified

1. **phone_number normalization** — No trim before insert. " 0901234567" vs "0901234567" would bypass UNIQUE constraint intent. Same class as license_plate bug from 03-02.
2. **email/id_card_number empty-string → null criticality** — Both are UNIQUE + nullable. PostgreSQL allows multiple NULLs but rejects multiple empty strings with 23505. The plan mentioned empty→null generically but didn't flag this as a correctness requirement (not cosmetic).
3. **phone_number format validation** — No regex constraint. Garbage like "abc" passes Zod min(1) validation.
4. **date_of_birth future date** — No guard against future dates. Users could enter impossible birth dates.
5. **gender mapping ambiguity** — Plan said "Map gender Vietnamese labels to DB values" in serializeToInsert, but if Select uses DB values directly, no mapping is needed. Conflicting guidance could cause incorrect implementation.
6. **Search trim before ilike** — API layer didn't specify trimming search input, allowing leading/trailing spaces to cause empty results.
7. **Auth-expiry on list page** — mapSupabaseError was only referenced for form dialog. List page error state also needs auth-expiry handling.
8. **Task 3 regression check** — Missing explicit `npm run build` verification for router change.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | phone_number trim in serializeToInsert prevents UNIQUE bypass | Task 2 action → serializeToInsert description | Added explicit phone_number trim requirement with rationale (same class as 03-02 license_plate) |
| 2 | email/id_card_number empty→null is correctness-critical not cosmetic | Task 2 action → serializeToInsert description | Added CRITICAL callout explaining PostgreSQL UNIQUE NULL behavior — multiple NULLs allowed, multiple empty strings rejected with 23505 |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Vietnamese phone number regex validation | Task 2 action → phone_number Zod schema | Added `.regex(/^(0\d{9,10})$/, ...)` with Vietnamese error message |
| 2 | id_card_number trim in serializeToInsert | Task 2 action → serializeToInsert description | Added id_card_number trim requirement |
| 3 | date_of_birth future date prevention | Task 2 action → date_of_birth Zod schema | Added `.refine()` comparing against today's date |
| 4 | Gender Select uses DB values directly | Task 2 action → gender field description | Clarified Select options use {value: 'male', label: 'Nam'} pattern; no label→value mapping in serializeToInsert |
| 5 | Search trim before ilike | Task 1 action → fetchCustomers description | Added `.trim()` on search parameter before ilike query |
| 6 | Auth-expiry on list page | Task 2 action → customers-page error state | Added reference to mapSupabaseError for auth-expiry handling on list error state |
| 7 | AC-6 strengthened with phone format + future date | AC-6 acceptance criteria | Added phone format and date_of_birth future date validation expectations |
| 8 | npm run build in Task 3 verify | Task 3 verify section | Added explicit `npm run build passes` regression check |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | DB-level CHECK constraint on phone_number format | Would require migration. App-level regex is sufficient for MVP. Can add later if needed. |
| 2 | id_card_number format validation (CMND 9-digit / CCCD 12-digit) | Vietnamese ID format has edge cases (old CMND, new CCCD, passport numbers for foreigners). Complex validation risks rejecting valid inputs. |
| 3 | date_of_birth minimum age business rule | No clear business rule defined for minimum passenger age. Can add if needed. |

## 5. Audit & Compliance Readiness

- **Defensible audit evidence:** Standard CRUD with mapSupabaseError provides error traceability. 23505 constraint discrimination by constraint name (in `message` field, not `details` — per 06-02 audit finding) is correctly specified.
- **Silent failure prevention:** Error states on both list page and form dialog. Auth-expiry handled in both locations after this audit.
- **Post-incident reconstruction:** TanStack Query caching + Supabase logging provides adequate reconstruction capability.
- **Data integrity:** UNIQUE constraints on phone_number, email, id_card_number protect at DB level. App-level normalization (trim, null coercion) prevents edge-case bypasses.

## 6. Final Release Bar

**Must be true before shipping:**
- All 8 acceptance criteria met
- npm run build passes
- Phone number trim and email/id_card_number null coercion verified (can test by creating two customers without email)
- Duplicate constraint error messages verified for all three UNIQUE columns

**Remaining risks:**
- No DB-level format validation on phone_number (app-level only)
- Loyalty points column exists but has no UI (read-only is acceptable)
- Permission-gated UI deferred (consistent with all prior phases)

**Would I sign off:** Yes, with the applied upgrades. The plan is consistent with established patterns and the identified data integrity gaps have been remediated.

---

**Summary:** Applied 2 must-have + 8 strongly-recommended upgrades. Deferred 3 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
