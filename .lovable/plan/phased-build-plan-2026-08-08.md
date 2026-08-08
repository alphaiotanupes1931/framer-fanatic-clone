# Phased build plan

Grouped into 5 phases so each one can be reviewed as it lands.

## Phase 1 - Labels, menu and small UI
- Home screen "directions" card: dismiss permanently (saved per user, never returns).
- Profile page: rename the "Feed" tab to "About".
- Profile page: add a "Public View" button that shows the profile exactly as visitors see it.
- Add a Festivals page and put it in the main menu (left sidebar + mobile nav).
- Sign-in / sign-up account options: only "Resident" and "Visitor". Remove "Artist" from that step (artist pages are still created later from Create).
- Any remaining "Manage tickets in studio" wording becomes "Organizer Studio".

## Phase 2 - Event creation
- Neighborhood becomes a required dropdown of Baltimore neighborhoods, moved to the top of the form directly under date/time.
- "Online" toggle next to neighborhood. When Online is selected, venue name and address are hidden and not required.
- Venue name and address auto-fill/autocomplete as the organizer types (suggestions from venues already used on the platform).

## Phase 3 - Arts Org creation and org pages
- More required fields on Create Arts Org (name, about/mission, neighborhood, email, contact).
- Neighborhood becomes a dropdown.
- Email becomes a real field on the create form rather than only the shortcut.
- Fix the missing event photo on org pages (e.g. "We Perform Test 2 > Events").
- Cultural institutions: keep the Artists tab, but only show it when the org has artists or the owner turns it on.

## Phase 4 - Resident / Visitor / Artist page parity
- Visitor pages get the same layout and setup as Resident pages, with City required and Neighborhood not required.
- Artist pages get the same layout as Resident pages.
- Under "My Pages" on the Resident page, each extra page gets a public/private toggle. Private pages are hidden from listings and public profile views.

## Phase 5 - Fix the artist/profile overlap
- Remove the remaining coupling between a user's artist page and their personal profile so editing or deleting one never affects the other, and links always resolve to the page that was clicked.
- Fix "video not found" when a video link is shared (shared links must resolve for signed-out and first-time visitors).
- Calendar: clicking a day number opens that day's events.

## Technical notes
- Neighborhood dropdowns read from the existing `neighborhoods` table.
- Page visibility adds a `is_public` flag on `organizations` plus policy updates.
- Online events store a flag on `events`; venue/address stay null.
- Shared video links are fixed by making the video detail route load without requiring a session.
