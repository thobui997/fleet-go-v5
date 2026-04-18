# Phase 14: Login Page UI Redesign — Context

**Created:** 2026-04-18
**Status:** Discussion complete, ready for planning

---

## Goals

What success looks like for this phase:

1. **Split-screen layout** — Modern two-column design with left branded cover area and right focused form panel
2. **Professional first impression** — Clean, premium feel that establishes strong branding on first user interaction
3. **Dark mode support** — Both cover and form sections adapt to dark mode while maintaining contrast and visual consistency
4. **Accessibility** — ARIA labels, keyboard navigation, proper focus states, screen reader support
5. **Branded assets** — Create logo concept, cover background/illustration that matches the FleetGo transportation product identity
6. **UX polish** — Loading states during auth, password visibility toggle, clear error display (Vietnamese, consistent with toast pattern), remember me checkbox

## Approach

**Technical direction:**
- Use Shadcn/ui components + TailwindCSS (consistent with existing codebase)
- FSD architecture — login page lives in `@pages/login` slice
- Supabase GoTrue auth integration (existing, preserve functionality)
- Vietnamese locale for all user-facing text
- Dark mode via existing CSS variable system

**Layout pattern:**
```
┌─────────────────────────────────────────────────┐
│  Cover Area (40-50%)  │  Form Panel (50-60%)    │
│  [Branded visual]     │  [Logo]                 │
│  - Image/illustration │  [Welcome text]         │
│  - Gradient/pattern   │  [Email input]          │
│  - Full-height        │  [Password input + eye] │
│                       │  [Remember me]          │
│                       │  [Forgot password link] │
│                       │  [Login button]         │
│                       │  [Error toast]          │
└─────────────────────────────────────────────────┘
```

**Responsive:**
- Desktop: Split-screen (cover left, form right)
- Tablet: Stacked (cover top 30%, form bottom 70%)
- Mobile: Form-only (cover hidden or minimized to banner)

## Scope

**In scope:**
- Split-screen layout implementation
- Cover area design and implementation
- Form panel refinement (spacing, hierarchy, states)
- Dark mode variants for both sections
- Branded asset creation (logo, cover visual)
- Loading states (button disabled + spinner)
- Password visibility toggle
- Error display (invalid credentials, network errors)
- Accessibility (ARIA, keyboard nav, focus indicators)

**Out of scope:**
- Social login (Google/OAuth providers)
- Sign-up/registration flow
- Password reset flow (separate page)
- Auth logic changes (preserve existing Supabase integration)

## Open Questions

Items to decide during planning:

1. **Cover visual style**
   - Photo (coach/fleet imagery)
   - Illustration (custom artwork)
   - Abstract gradient/pattern
   - Combination approach

2. **Color palette emphasis**
   - Transportation/coach themed colors
   - Neutral/professional palette
   - Brand accent color integration

3. **Logo style**
   - Wordmark (FleetGo text only)
   - Icon + wordmark combination
   - Transportation-themed icon

4. **Form interactions**
   - Real-time validation hints or submit-only?
   - Success state before redirect?
   - Entrance animation preference

## Dependencies

- **Phase 1** — Existing auth system, login page structure, Supabase integration
- **Phase 13** — Toast message pattern for consistent error display
- **Design tokens** — Existing Tailwind config, CSS variables, dark mode system

## Handoff Notes

For the planning phase (`/paul:plan`):

- Start by reviewing current login page implementation in `@pages/login`
- Consider breaking into 2 plans: (14-01) layout + assets, (14-02) form refinement + polish
- Use `/frontend-design` skill for asset creation and visual direction
- Include accessibility verification in human-verify checkpoints
- Test dark mode transitions and contrast ratios
- Verify Vietnamese translations for all new text

---

*This context persists across `/clear` so discussion can be resumed if needed.*
