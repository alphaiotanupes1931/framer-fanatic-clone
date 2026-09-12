# Planet Baltimore Interface Standardization

## Goal
Make the entire platform feel like one product and produce a living reference page that documents the approved interface patterns.

The current website colors, fonts, navigation structure, and established Planet Baltimore identity will stay. This work standardizes presentation without changing business rules or removing features.

## What the audit found
- Shared building blocks already exist for buttons, tabs, cards, fields, badges, empty states, page banners, and back navigation.
- Many screens bypass those building blocks and recreate controls by hand.
- The code currently contains hundreds of one-off buttons, hardcoded colors, and competing corner-radius and spacing patterns.
- The largest inconsistencies are in Organizer Studio, organization pages, profiles, Calendar, event creation, Festivals, Videos, messaging dialogs, and admin screens.
- Some screens use accessible shared controls, while others use visually similar raw controls with different focus, disabled, loading, and mobile behavior.

## Canonical visual rules
- Keep the current website palette and typography.
- Use semantic colors such as background, foreground, card, primary, muted, border, destructive, orange, and map accent.
- Use the shared Button for commands and links that act like buttons.
- Use icon-only buttons for familiar actions, always with labels for assistive technology and tooltips where meaning is unclear.
- Use one compact back-button pattern throughout the platform.
- Use one branded banner for directory pages and one lightweight page header for internal/detail pages.
- Use shared tabs with consistent active, focus, scrolling, and mobile behavior.
- Use badges for static status and chips for interactive filters or selections.
- Use cards only for individual repeated items or framed tools, not as containers around every section.
- Standardize spacing, loading states, empty states, form labels, validation, disabled states, and destructive actions.
- Keep controls rounded consistently, with restrained card radii and fully rounded command buttons only where appropriate.

## Phase 1: Build the documented foundation
- Expand the shared Button variants to cover the real platform needs: primary orange, neutral, outline, ghost, destructive, icon, loading, and compact actions.
- Add shared components for:
  - Lightweight page headers
  - Section headings
  - Selectable and removable chips
  - Standard action rows
  - Responsive content grids
  - Form fields with labels, hints, required markers, and errors
- Refine existing HeroBanner, PageBackButton, Tabs, Badge, Card, Input, Textarea, Select, and EmptyState so they use semantic tokens only.
- Add a private admin-only “Design System” page showing every approved component, state, size, label convention, spacing rule, and responsive example.
- Add the Design System page to the admin navigation.

## Phase 2: Standardize highest-impact workflows
Migrate the screens with the largest number of custom patterns first:
1. Organizer Studio and ticket management
2. Organization, business, arts organization, group, and community association pages
3. Personal and public profiles
4. Calendar and Events
5. Festivals and festival creation
6. Messaging and sharing dialogs
7. Post, Story, and Video creation/editing

Each migration will replace one-off controls with the documented components while preserving current behavior.

## Phase 3: Standardize the remaining platform
- Discovery, search, saved content, notifications, referrals, leaderboard, marketplace, and neighborhood pages
- Ticket pages and verification views
- Admin screens and reports
- Authentication, onboarding, settings, support, policy, and error pages
- Empty, loading, success, permission, and failure states

## Phase 4: Verification and documentation readiness
- Test representative owner, staff, signed-in visitor, and signed-out visitor views.
- Check desktop and mobile layouts for overflow, overlap, truncation, focus visibility, touch targets, and keyboard navigation.
- Confirm dark and alternate themes still work because migrated pages use semantic colors.
- Verify that destructive controls remain clearly separated and require confirmation where appropriate.
- Use the admin Design System page as the source for product documentation screenshots and future development.

## Technical details
- Tailwind v4 tokens remain in `src/styles.css`; no separate Tailwind configuration will be introduced.
- Existing shared controls under `src/components/ui` remain the base layer.
- Product-level patterns live under `src/components/shared`.
- Raw buttons remain only where native behavior is necessary and the shared Button cannot represent it.
- Hardcoded page colors will be replaced with semantic tokens, including the existing branded orange token.
- Existing routes, data access, permissions, and workflows remain unchanged unless a visual migration exposes a broken interaction.
- Large pages will be migrated incrementally rather than rewritten wholesale, reducing regression risk.

## Completion criteria
- Every interactive command uses an approved shared pattern.
- Every content page uses an approved header, section, tab, card, form, and empty-state pattern where applicable.
- No new hardcoded brand colors appear in page code.
- The admin Design System page accurately reflects what appears throughout the live platform.
- Representative desktop and mobile journeys pass visual and interaction checks.
