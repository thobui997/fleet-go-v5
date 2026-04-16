# Context: Header UI Redesign

## Phase
Enhancement to v0.1 (not a new phase — polish on Phase 1 Foundation & Auth)

## Source
User discussion — 2026-04-17

## Key Goals
1. Replace bare email + separate logout button with user avatar (initials) + dropdown menu
2. Clean & minimal visual style — Linear/Notion-inspired, generous spacing, subtle separation
3. Keep left side empty on desktop (hamburger on mobile only)

## Approach Notes

### Avatar
- Initials-only (colored circle with first letter from `profiles.full_name`, email fallback)
- No profile picture support for now

### Dropdown Menu
- Contains: user name + email info section, then logout action
- Dark mode toggle stays as separate icon button in header (NOT inside dropdown)

### Data Access
- Currently only `user.email` from Supabase auth is available in header
- Need to fetch `profiles.full_name` from profiles table for name display and initials
- Options: extend auth context, or use a separate TanStack Query in the header component

### Layout
- Left side: hamburger (mobile only), empty on desktop
- Right side: dark mode toggle + user avatar with dropdown
- Height stays at h-14 (56px), sticky, backdrop blur

## Open Questions (for planning)
- How to fetch profile data efficiently (extend auth context vs. separate query)
- Avatar color generation approach
- Dropdown component choice (Shadcn DropdownMenu already available)

## Constraints
- Enhancement scope — no new milestone
- Must maintain responsive behavior (mobile/desktop)
- Must work with existing sidebar integration
- Vietnamese UI language maintained
