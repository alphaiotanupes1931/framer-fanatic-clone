# Updates list: build and verify

Work through the items in your UPDATES sheet. Each one below was checked against the live code first, so the list separates what still needs building from what only needs testing.

## 1. Artist Contact messages go to inbox and email

Today a contact form message is only stored in the database. Nobody is notified.

- Sending a message also creates a real Planet Baltimore message thread with the page owner.
- The owner also gets an email with the same content.
- Both start with the chosen reason: "Commission", "Booking", "Press", "Collaboration" or "General", then the sender's name, email and message.

## 2. Group and community association events stay private

Right now an event created inside a group or community association shows up on the public Events page, search and calendar.

- Events attached to a group or community association appear only on that page.
- They stay out of the Events page, home listings, calendar, search and sitemap.
- Events for artist, arts organization and business pages keep showing publicly as they do now.

## 3. Referral points count all three levels

Only direct referrals are counted today (5 points each), while the page shows three levels.

- Points now include the people your referrals brought in, and the people they brought in.
- Level 1, 2 and 3 counts each show separately in your referral network, with the total.

## 4. Remove the outside ticket link from festivals

Delete the "Ticket / registration link" field from the festival editor so festival tickets are handled on Planet Baltimore only. Any link already saved stops being shown.

## 5. Shop on groups and community associations

Add the Shop tab (products, buying, shipping details, seller Orders view) to group and community association pages, matching how artist pages work today.

## 6. You become everyone's first friend

When a new member finishes signing up, your account and theirs automatically follow each other, so their feed is not empty.

## 7. Capacity stops sales and RSVPs

Paid checkout already blocks at capacity. Confirm free RSVP does the same, and fix it if it does not, so no one can RSVP past the limit.

## Items already built: test and report

These are already in the code. I will test each and fix anything broken rather than rebuild:

- Business page staff login with its own username and password.
- Signing up from an event invite returning to that event afterward.
- No past dates or times allowed on events.
- Mobile having the same features as desktop.
- Shop checkout collecting shipping address and buyer details.
- Old events not featured on the main page and in search.
- Leaderboard and Comments already removed from community association pages. Threads stays as the discussion tab.

## Technical details

- Contact: server function inserting into `conversations`/`messages` plus an email through the existing transactional email path, triggered from `ContactTab`; keeps the `artist_inquiries` row.
- Private events: filter by `events.organization_id` joined to `organizations.type in ('group','community_assoc')` in `events.index`, home, calendar, search, discover and the events sitemap.
- Referrals: recursive count over `profiles.referred_by` (depth 3) exposed as a security-definer function, consumed by the referral network dialog and leaderboard.
- Festival: drop the `ticket_url` field from the festival editor form and its display; column stays in `festival_details`.
- Shop: add `"Shop"` to `ASSOC_TABS` and `COMMUNITY_ASSOC_TABS` in `o.$slug.tsx`; `StoreTab` already handles any `orgId`.
- First friend: after onboarding completes, insert both `follows` rows for the admin account and the new member, ignoring duplicates.
- Free RSVP: verify `rsvp_free_event` checks `event_capacity_status`; add the check in the function if missing.
- Verification: `bunx tsgo --noEmit` plus signed-in browser runs of each flow.
