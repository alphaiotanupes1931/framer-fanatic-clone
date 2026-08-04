# Full App Sweep: Make Every Button and Feature Work

Goal: go through all 67 pages and every interactive control, fix what is broken or half-built, and close the outstanding security and setup gaps from the earlier audit. Work is split into phases so you can verify after each one.

## Phase 1: Security and access (highest risk, do first)

1. Remove the `x-admin-secret` header backdoor from the `is_admin_caller()` database function so admin power comes only from a real admin role.
2. Lock down member emails: revoke public read on the email column, and expose email only through two narrow functions (your own profile, and buyer contacts for an event you organize).
3. Tighten post visibility rules so `followers`, `close_friends`, and `only_me` posts are actually enforced instead of readable by anyone.
4. Confirm admin login works only against the environment credentials, with no legacy fallback anywhere.

Verification after Phase 1: admin login, a private post viewed while signed out, and a normal profile page load.

## Phase 2: Sweep every page and control

Systematic pass through all routes in groups. For each page: click every button, submit every form, confirm the result actually persists and the UI updates without a refresh.

- Home, discover, neighborhoods, map, calendar
- Stories: create, edit, delete, save, share, comment, like
- Posts and videos: create, multi-upload, edit, delete, save, share, carousel
- Events: create, edit, RSVP, tickets, delete, save, share
- Profiles: resident, visitor, and every artist category (tabs, CV, shop, talk, invite)
- Organizations: business, cafe/bar/restaurant, arts org, community association (feed, menu, dues, support, message all, press)
- Messaging: conversations, group chats, search, rich previews
- Saved items, settings, notifications, follow/unfollow
- Admin: users, content, trash, featuring, deletions

Each broken control gets fixed in place. Anything that is a dead end (a control with nothing behind it) is either wired up or removed, not left visible.

## Phase 3: Things that are not set up yet

1. **Email sending.** Campaigns and invitations currently open the user's own mail app via a `mailto:` link. That breaks on large lists and looks unbranded. Set up real transactional email from a Planet Baltimore address so campaigns, ticket confirmations, and invites send from the platform.
2. **Payments end to end.** Verify Stripe Connect onboarding, ticket purchase, donations, and dues actually complete and record correctly, with duplicate-payment protection and a scheduled reconciliation job.
3. **Support page.** Replace the "Coming soon" block with a working contact and help flow.
4. **Production environment.** The separate production deployment still needs the admin username, admin password, and session secret variables set, plus a redeploy. Until that happens, admin login only works on the preview.

## Phase 4: Media reliability and speed

1. Migrate the 171 records still pointing at external `base44.app` originals onto our own storage so images stop failing to load.
2. Replace 10-year signed image URLs with short-lived URLs generated at render time.
3. Resize and compress oversized originals, and confirm every image on the site loads through the smart image component.

## Phase 5: Final pass

Full click-through on desktop and mobile, dark mode check, then a written report of anything intentionally left out.

## Technical notes

- Phases 1, 3.2, and 4.2 need database migrations; each is applied separately so it can be rolled back on its own.
- Phase 3.1 requires an email domain to be connected; I will need you to confirm which domain to send from.
- Phase 3.4 is the only item I cannot do myself, since the production host is not connected here.