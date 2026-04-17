---
phase: 11-date-input-migration
plan: 01
subsystem: ui
tags: shadcn, react-hook-form, date-picker, date-fns, vietnamese-locale

# Dependency graph
requires:
  - phase: 10
    provides: FormSection component pattern, dayjs configuration
provides:
  - Shared DatePicker and DateRangePicker components for consistent date input UX
  - Foundation for form date field migration (Plan 11-02)
  - Foundation for list page filter migration (Plan 11-03)
affects: phase-11-forms-migration, phase-11-filters-migration

# Tech tracking
tech-stack:
  added: react-day-picker@9.14.0, @radix-ui/react-popover, date-fns@4.1.0
  patterns: React Hook Form Controller wrapper, Vietnamese locale via date-fns, date-only ISO strings (YYYY-MM-DD)

key-files:
  created: src/shared/ui/calendar.tsx, src/shared/ui/popover.tsx, src/shared/ui/date-picker.tsx, src/shared/ui/form/DatePicker.tsx, src/shared/ui/form/DateRangePicker.tsx, src/shared/ui/form/index.ts
  modified: src/shared/ui/index.ts, package.json, tsconfig.json

key-decisions:
  - "Use date-fns instead of dayjs for locale: react-day-picker has built-in date-fns integration"
  - "Return empty string for null/undefined: prevents undefined crashes in form submission"
  - "Date-only ISO strings (YYYY-MM-DD): timezone-agnostic consistency"

patterns-established:
  - "Controller wrapper pattern for React Hook Form integration"
  - "Controlled value/onChange pattern for uncontrolled filter inputs"
  - "Relative imports within shared folder for composite project compatibility"

# Metrics
duration: 15min
started: 2026-04-17T10:45:00Z
completed: 2026-04-17T11:00:00Z
---

# Phase 11 Plan 01: Shadcn DatePicker Foundation Summary

**Shadcn DatePicker and DateRangePicker components installed with Vietnamese locale support, establishing the foundation for consistent date input UX across all forms and filters.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | 15 minutes |
| Started | 2026-04-17T10:45:00Z |
| Completed | 2026-04-17T11:00:00Z |
| Tasks | 4 completed (3 auto + 1 checkpoint) |
| Files modified | 8 created, 3 modified |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Shadcn DatePicker installed and configured | Pass | react-day-picker v9.14.0 installed, calendar.tsx, popover.tsx, date-picker.tsx created |
| AC-2: DatePicker wrapper integrates with React Hook Form | Pass | Uses Controller pattern, returns empty string for null/undefined, date-only ISO strings |
| AC-3: DateRangePicker wrapper handles from/to dates | Pass | Two-date flex layout, validates from ≤ to with error message |
| AC-4: Vietnamese locale displays correctly | Pass | Uses date-fns with vi locale |
| AC-5: DatePicker handles error scenarios | Pass | Validation errors display clearly, form submission blocked until corrected |

## Accomplishments

- Shadcn DatePicker component infrastructure installed (react-day-picker, calendar, popover base components)
- DatePicker wrapper created with React Hook Form Controller integration for form use
- DateRangePicker wrapper created for list page filter use cases
- Vietnamese locale configured via date-fns
- Null/undefined handling standardized (returns empty string, not undefined)
- Date-only ISO string format established (YYYY-MM-DD, timezone-agnostic)

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Install Shadcn DatePicker | N/A | feat | react-day-picker v9.14.0, calendar/popover/date-picker base components |
| Task 2: Create DatePicker wrapper | N/A | feat | RHF Controller wrapper with Vietnamese locale, empty string returns |
| Task 3: Create DateRangePicker wrapper | N/A | feat | Filter component with from/to validation |

*Note: Changes not yet committed to git*

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/shared/ui/calendar.tsx` | Created | Base calendar component using react-day-picker |
| `src/shared/ui/popover.tsx` | Created | Popover component for date picker dropdown |
| `src/shared/ui/date-picker.tsx` | Created | Base DatePicker component |
| `src/shared/ui/index.ts` | Modified | Added Calendar, Popover, DatePicker exports |
| `src/shared/ui/form/DatePicker.tsx` | Created | RHF Controller wrapper for form integration |
| `src/shared/ui/form/DateRangePicker.tsx` | Created | Filter component with from/to dates |
| `src/shared/ui/form/index.ts` | Created | Exports form components |
| `package.json` | Modified | Added react-day-picker, @radix-ui/react-popover |
| `tsconfig.json` | Modified | Added path aliases to root for composite project |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use date-fns instead of dayjs for locale | react-day-picker has built-in date-fns integration, simpler setup | Future date components should use date-fns for consistency |
| Return empty string for null/undefined | Prevents undefined crashes in form submission | Form submission logic can rely on string type |
| Date-only ISO strings (YYYY-MM-DD) | Timezone-agnostic, consistent with database DATE columns | No timezone conversion issues in form handling |
| Relative imports within shared folder | TypeScript composite project path resolution issues | Use relative imports for shared folder internal imports |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | Essential fixes for build compatibility |

### Auto-fixed Issues

**1. TypeScript Path Resolution**
- **Found during:** Build verification after Task 3
- **Issue:** `@/shared/lib` and `@/shared/ui` imports failed to resolve in TypeScript composite project
- **Fix:** Added path aliases to root `tsconfig.json` and used relative imports within shared folder
- **Files:** `tsconfig.json`, all new component files
- **Verification:** `npm run build` passed with zero errors

**2. Unused Variable Warning**
- **Found during:** Build verification
- **Issue:** `placeholder` prop declared but never used in DateRangePicker
- **Fix:** Removed unused `placeholder` prop from interface and function signature
- **Files:** `src/shared/ui/form/DateRangePicker.tsx`
- **Verification:** Build passed with no warnings

**3. Dependency Installation with Legacy Peer Deps**
- **Found during:** Task 1 (shadcn install failed)
- **Issue:** npm dependency conflict with eslint versions
- **Fix:** Used `--legacy-peer-deps` flag for dependency installation
- **Files:** `package.json`
- **Verification:** Dependencies installed successfully, no runtime issues

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Shadcn CLI registry URL not found | Manually created calendar.tsx, popover.tsx, date-picker.tsx components |
| npm dependency conflict (eslint versions) | Used `--legacy-peer-deps` flag |
| TypeScript module resolution in composite project | Added path aliases to root tsconfig.json + relative imports |

## Next Phase Readiness

**Ready:**
- DatePicker and DateRangePicker components available for migration
- Form wrapper pattern established for Plan 11-02 (form date fields)
- Filter component pattern established for Plan 11-03 (list page filters)
- Vietnamese locale configured via date-fns
- Build passes with zero errors

**Concerns:**
- None

**Blockers:**
- None

---
*Phase: 11-date-input-migration, Plan: 01*
*Completed: 2026-04-17*
