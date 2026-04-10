# Enterprise Plan Audit Report

**Plan:** .paul/phases/01-foundation-auth/01-03-PLAN.md
**Audited:** 2026-04-10
**Verdict:** Conditionally acceptable

---

## 1. Executive Verdict

The plan is **conditionally acceptable** for production execution. The architecture is sound — FSD placement is correct, Supabase GoTrue integration is appropriate, and the task breakdown is logical. However, two specific gaps around error handling and session loading UX would cause production incidents if shipped as-is. After applying the must-have and strongly-recommended fixes, this plan is ready for APPLY.

I would approve this plan for production **after** the applied fixes are implemented.

## 2. What Is Solid

- **FSD placement:** Auth in `shared/auth/` is correct per FSD v2.1 guidelines. Auth tokens and session management are shared infrastructure, not a feature or entity. This decision prevents every page from importing from a features/auth layer.
- **AuthContextValue interface:** Well-defined with clear types. Separating `user`, `session`, `isLoading`, and `isAuthenticated` gives consumers the right granularity.
- **ProtectedRoute pattern:** Using `useLocation()` + `state={{ from: location }}` for post-login redirect is the standard, correct approach. No need to reinvent this.
- **Scope limits:** Correctly excludes registration, RBAC, forgot password, MFA, and social login. Each exclusion is justified with a specific future phase.
- **Boundary protection:** Properly protects all prior plan artifacts. The only allowed modification to app layer is adding AuthProvider to providers tree, which is architecturally necessary.
- **Task independence:** Task 1 (auth context) can be built and tested independently before Tasks 2-3 depend on it. Good sequencing.

## 3. Enterprise Gaps Identified

### Gap 1: Generic error handling on login failure
**Risk:** The plan says "on failure an error message is displayed" but provides no mapping of Supabase error codes to user messages. Supabase returns specific error codes (`invalid_credentials`, `email_not_confirmed`, `too_many_requests`). Without mapping, users either see raw Supabase messages (confusing, potentially leaking implementation details) or a generic "something went wrong" (unhelpful for troubleshooting).

**Why it matters:** In a production system used by non-technical Vietnamese-speaking staff, error messages must be actionable. "invalid_credentials" is meaningless; "Email hoặc mật khẩu không chính xác" tells the user what to do.

### Gap 2: Session loading flash on login page
**Risk:** The login page checks "if already authenticated, redirect to dashboard." But during the initial `getSession()` call, `isLoading` is true and `isAuthenticated` is false. An authenticated user refreshing or navigating to `/login` would briefly see the login form before being redirected. This creates a jarring flash and undermines confidence in the system.

**Why it matters:** Users in operational environments (dispatchers, ticketing agents) rely on consistent UX. A flash of the login page suggests the system logged them out, causing unnecessary alarm and potential duplicate login attempts.

### Gap 3: Subscription cleanup not specified
**Risk:** `supabase.auth.onAuthStateChange` returns a subscription object. The plan says "cleanup listener on unmount" but doesn't specify `subscription.unsubscribe()`. In React's StrictMode (dev) or with route changes, the component may mount/unmount multiple times, creating duplicate listeners that cause stale state updates and memory leaks.

### Gap 4: Double-submit not explicitly prevented
**Risk:** Network latency on mobile connections could allow users to tap "Đăng nhập" multiple times, triggering duplicate `signInWithPassword` calls. React Hook Form's `isSubmitting` state helps, but the plan doesn't explicitly require using it to disable the button.

### Gap 5: AuthContextValue type not exported
**Risk:** Future features (Phase 4+ Employee & Role Management) will need to type-check against the auth context. Without exporting the type, consumers either import the internal file (violating FSD public API rule) or use `ReturnType<typeof useAuth>` (fragile, breaks if hook signature changes).

## 4. Upgrades Applied to Plan

### Must-Have (Release-Blocking)

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Auth error mapping — Supabase error codes must map to Vietnamese user messages | Task 2 `<action>`, AC-2, `<verification>` | Added `AUTH_ERROR_MESSAGES` map specification with specific Supabase error codes and Vietnamese translations. Added AC-2 acceptance criteria for error mapping. Added verification check. |
| 2 | Session loading flash — login page must show loading state during initial auth check | Task 2 `<action>`, AC-2, `<verification>` | Added session loading guard: login page renders Skeleton/spinner while `isLoading=true`, no redirect during loading. Added AC-2 acceptance criteria. Added verification check. |

### Strongly Recommended

| # | Finding | Plan Section Modified | Change Applied |
|---|---------|----------------------|----------------|
| 1 | Subscription cleanup pattern — specify `subscription.unsubscribe()` explicitly | Task 1 `<action>` | Added explicit cleanup instruction: store subscription from `onAuthStateChange` return value, call `subscription.unsubscribe()` in useEffect cleanup |
| 2 | Double-submit prevention — disable submit button during authentication | Task 2 `<action>`, AC-2, `<verification>` | Added `disabled={isSubmitting \|\| isLoading}` requirement for submit button. Added AC-2 acceptance criteria. Added verification check. |
| 3 | Export AuthContextValue type — for type-safe auth consumption | Task 1 `<action>`, Task 1 `index.ts`, Task 1 `<verify>` | Added `export type { AuthContextValue }` to index.ts public API. Added type import verification. |

### Deferred (Can Safely Defer)

| # | Finding | Rationale for Deferral |
|---|---------|----------------------|
| 1 | HMR-safe auth state — hot module replacement losing React context state | Development-only concern. Production builds don't use HMR. DX improvement can be addressed with proper dev tooling later. |

## 5. Audit & Compliance Readiness

- **Defensible audit evidence:** The auth context captures user and session state. Supabase provides server-side audit logs for auth events. Sufficient for current phase.
- **Silent failure prevention:** The error mapping requirement ensures auth failures surface to users. The `isLoading` state prevents silent redirects.
- **Post-incident reconstruction:** Supabase GoTrue maintains auth event logs server-side. Client-side state is ephemeral and doesn't need independent audit trails at this stage.
- **Ownership and accountability:** Auth module lives in `shared/auth/` with clear public API. Single source of truth for auth state.

## 6. Final Release Bar

**Must be true before this plan ships:**
- Auth error codes map to Vietnamese user messages (applied)
- Login page handles loading state without flash (applied)
- Subscription cleanup follows specified pattern (applied)
- Double-submit is prevented (applied)

**Risks that remain after fixes:**
- Network-level auth failures (Supabase unreachable) will show a generic error — acceptable for Phase 1, can be refined when offline/error patterns are established
- No client-side session expiry warning (e.g., "Your session will expire in 5 minutes") — Supabase handles auto-refresh; explicit warning can be added in a future iteration

**Would I sign my name to this system?** Yes, after the applied fixes are implemented. The architecture is sound, the security model follows Supabase best practices, and the error handling is now specified at the level needed for production use.

---

**Summary:** Applied 2 must-have + 3 strongly-recommended upgrades. Deferred 1 item.
**Plan status:** Updated and ready for APPLY

---
*Audit performed by PAUL Enterprise Audit Workflow*
*Audit template version: 1.0*
