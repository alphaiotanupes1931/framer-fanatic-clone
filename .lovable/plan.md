# Security and Launch-Blocker Remediation

Fix the P0 issues found in the independent audit, in dependency order. No new features.

## 1. Close the admin backdoor
Anyone can act as an administrator right now by sending a fixed header value that is committed in the source code. Verified live: an anonymous request returned the full member list.

- Rewrite the `is_admin_caller` database function to drop the header check. Admin status comes only from a real signed-in admin role or trusted server-side access.
- Change `src/lib/admin-supabase.server.ts` to use the privileged server client instead of the public key plus the leaked header.
- Remove the hardcoded fallback passwords (`admin123`, `planetbaltimore`) and the fallback session secret from `src/lib/admin-site.functions.ts` and `src/lib/admin-session.server.ts`. Admin login fails closed if the real secret is not configured.

## 2. Stop exposing member email addresses
Every profile's email is readable by anyone today. Restrict public profile reads to display fields only (name, username, avatar, bio, neighbourhood, role). Email stays visible to the account owner and to admins.

## 3. Make private posts actually private
Posts marked "only me", "close friends", or "followers" are readable by anyone. Rewrite the post read rule so visibility is enforced in the database, not just hidden in the interface.

## 4. Real protection on signed-in pages
Ten pages redirect logged-out visitors only after the page has already loaded and fetched data. Move them behind a proper authenticated layout so the check happens before anything renders.

## 5. Payment safety net
If Stripe's confirmation call never arrives, a buyer is charged and never receives a ticket. Add a verification step on the ticket success screen and a scheduled endpoint that re-checks recent unconfirmed orders against Stripe and completes them.

## 6. Remove the fake "message attendees" send
The Organizer Studio shows a success message for an email that is never sent. Disable the control with honest wording until a real email provider is connected.

## 7. Storage limits
Add file size caps and allowed file types to all five upload buckets, and restrict post media so it is not readable by every signed-in account.

## 8. Correct the social preview domain
The shared link preview points at an old placeholder domain, so link previews break everywhere.

## 9. Repair the broken admin trash page
The admin panel calls four database functions that do not exist. Either build them or remove the Trash tab.

## Technical notes
- Items 1, 2, 3 and 7 need database migrations: `is_admin_caller`, the `profiles` select policy plus column grants, the `posts` select policy, and `storage.buckets` limits with the `post-media` select policy.
- Item 4 introduces `src/routes/_authenticated/route.tsx` and moves `dashboard`, `saved`, `notifications`, `messages`, `onboarding`, `invite`, `leaderboard`, `marketplace`, `settings`, and `profile` under it.
- Item 5 adds a public scheduled route under `src/routes/api/public/` plus a session lookup on the ticket page.
- Item 8 is a one-line change to `SITE_ORIGIN` in `src/routes/__root.tsx`.
- Item 9 touches `ALLOWED_ADMIN_RPCS` in `src/lib/admin-site.functions.ts` and `src/routes/admin.trash.tsx`.

## Not in this plan (needs you first)
Connecting an email provider, switching Stripe to live keys, deleting seed accounts and fake organisation phone numbers, and installing analytics. These need external accounts or content decisions and are listed in the audit's "Needs a human" section.