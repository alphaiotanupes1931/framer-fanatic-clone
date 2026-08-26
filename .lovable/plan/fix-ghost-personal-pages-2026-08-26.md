# Fix ghost personal pages

## Changes
- Stop onboarding from creating organization records for Personal Resident and Visitor profiles. These choices will finish on the user's canonical personal profile.
- Keep Artist, Arts Organization, Business, Group, and Community Association pages as separately owned pages.
- Remove existing duplicate Resident and Visitor organization pages only after confirming they contain no page-specific content or memberships.
- Keep My Pages strictly filtered by `owner_id`, and exclude legacy personal-profile duplicates as an additional safeguard.
- Standardize visible navigation and page labels from “Associations” to “Community Associations”.
- Verify personal post avatars and names route to the canonical `/u/:username` profile on feed and post detail views.

## Technical details
- Update onboarding branching before the organization insert.
- Add UI-side filtering in both private and public Pages tabs.
- Apply a narrowly scoped database migration for confirmed legacy duplicate personal pages.
- Run targeted type checks and browser checks for onboarding completion, My Pages, and post profile links.
