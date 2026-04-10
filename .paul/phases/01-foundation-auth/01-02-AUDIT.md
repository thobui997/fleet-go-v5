# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-auth/01-02-PLAN.md
**Audited:** 2026-04-10
**Verdict:** Conditionally acceptable — 2 must-have fixes applied

---

## 1. Executive Verdict

**Conditionally acceptable.** The plan is well-structured with clear boundaries, good fallbacks for interactive CLI commands (learned from Plan 01-01), and appropriate scope limits. Two issues required action: the DataTable column interface was unspecified (a shared contract used across 7+ phases cannot be left to ad-hoc implementation), and Shadcn/ui init could silently overwrite CSS variables that Plan 01-01 carefully established. Both fixed. After fixes: would approve for execution.

## 2. What Is Solid

- **FSD boundary protection:** All Plan 01-01 files explicitly protected with only one targeted exception (Toaster wiring)
- **Interactive CLI fallback:** Manual components.json creation provided (lesson learned from Plan 01-01's vite create failure)
- **Component path verification:** Explicit check that components go to src/shared/ui/ not src/components/
- **Complete re-export list:** All Shadcn/ui sub-exports enumerated in public API
- **Pagination spec:** Matches PROJECT.md requirement (10/20/50/100)
- **Currency formatting:** Correct locale (vi-VN) and currency (VND) for the Vietnamese transportation domain
- **useDebounce design:** Generic, standard cleanup pattern, no over-engineering
- **FormFieldWrapper:** Clean React Hook Form integration pattern — wrapper receives error as prop, doesn't couple to form state
- **Scope limits:** No auth, no layout, no business components — correctly scoped for a shared UI foundation

## 3. Enterprise Gaps Identified

1. **DataTable column interface unspecified** — The plan referenced `ColumnDef[]` as a prop type but never defined the interface. This is a shared contract that every CRUD module (vehicles, routes, employees, trips, customers, bookings, payments) will depend on. Leaving it to ad-hoc implementation means each consumer might expect different shapes, creating implicit coupling or breaking changes.

2. **Shadcn/ui init may overwrite CSS variables** — Running `npx shadcn@latest init` writes to the CSS file specified in components.json. Plan 01-01 established 36 CSS custom properties (18 light + 18 dark). If Shadcn/ui init replaces this file, the theme is lost silently. The boundary says "DO NOT CHANGE" but the tool being invoked may do exactly that.

3. **Toaster not wired into component tree** — Creating toast/use-toast without rendering `<Toaster />` in the provider tree means `useToast()` calls succeed but nothing appears on screen. This requires a single-line addition to app-providers.tsx, which crosses the boundary but is functionally required.

4. **format-currency.ts imports dayjs but uses Intl** — The action description included `import dayjs from 'dayjs'` but described using Intl.NumberFormat. With TypeScript strict mode and noUnusedLocals, this would cause a build warning.

5. **components.json schema may not match current Shadcn/ui version** — Shadcn/ui's schema has changed across versions. The manual fallback JSON may not match the current CLI expectations.

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | DataTable column interface unspecified | Task 2, Step 1 | Added complete ColumnDef<TData>, DataTablePagination, and DataTableProps<TData> interfaces with typed fields |
| 2 | CSS variable overwrite risk | Task 1, Step (after init) | Added CSS protection warning and verification step (#6) to check all 36 CSS variables are intact after init |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Toaster not wired | Task 3, end of action | Added Toaster wiring instruction to app-providers.tsx, updated boundary exception and files_modified |
| 2 | Unused dayjs import in format-currency | Task 3, Step 1 | Removed spurious dayjs import, clarified "Do NOT import dayjs" |
| 3 | components.json schema uncertainty | Task 1, after init | Added schema verification note: trust CLI-generated schema but verify aliases point to @/shared paths |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | Visual regression testing for Shadcn/ui components | Shadcn/ui components are well-tested upstream; custom components (DataTable) will be tested via feature integration |
| 2 | Storybook setup for component documentation | Valuable but not a scaffolding concern; can add when component library stabilizes |
| 3 | Accessibility audit of Shadcn/ui components | Shadcn/ui handles a11y (ARIA attributes, keyboard navigation) out of the box |
| 4 | Component prop documentation generation | TypeScript types serve as documentation; formal docs can be added later |

## 5. Audit & Compliance Readiness

**Evidence production:** Build/typecheck/lint verification provides defensible evidence. components.json and public API exports document what was installed.

**Interface contracts:** The ColumnDef interface (added) creates a typed contract between the shared layer and all feature modules. This is enterprise-grade — implicit contracts break under change.

**CSS variable protection:** Verification step added to ensure theme integrity is maintained across tool installations.

**Areas that would fail a real audit:**
- No component-level unit tests (deferred — acceptable for scaffolding phase)
- No visual regression baseline (deferred — acceptable)
- No accessibility testing beyond what Shadcn/ui provides (acceptable)

## 6. Final Release Bar

**Must be true before this plan ships:**
- All Shadcn/ui components installed and importable from @shared/ui
- DataTable accepts generic types with defined ColumnDef interface
- CSS variables from Plan 01-01 are intact (not overwritten)
- Toaster renders in the component tree (toasts actually appear)
- formatCurrency produces correct VND output
- All verification checks pass (build, typecheck, lint)

**Remaining risks after fixes:**
- Shadcn/ui CLI may change behavior in future versions (mitigated by manual fallback)
- DataTable sorting is client-side only (acceptable — server-side sorting comes per-feature)

**Would I sign my name to this?** After the applied fixes — yes. The ColumnDef contract and CSS protection address the real risks.

---
**Summary:** Applied 2 must-have + 3 strongly-recommended upgrades. Deferred 4 items.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
