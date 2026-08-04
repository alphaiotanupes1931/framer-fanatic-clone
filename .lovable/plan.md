# Security Remediation, Revised

Your corrections are all accepted. Two of them changed the facts materially, and one item was simply wrong in my previous plan. Details below.

---

## Before any migration: backup and restore

**I cannot confirm a snapshot exists.** I have no tool that reports backup or point-in-time-recovery status for this database, and I will not claim one is there. Do this before I run anything:

1. Open Cloud, then Advanced settings, then Export data, and download the export. That is your restore artifact.
2. Restoring is a manual re-import of that export; there is no one-click undo from my side.

Because of that, every migration below is written to be reversible on its own: each one is a policy or function change with a stated inverse, and none of them drop a column or delete a row. If item 1 goes wrong the inverse is to restore the previous version of the `is_admin_caller` function, which I will keep verbatim in the chat before I change it.

Tell me the export is downloaded and I will start.

---

## Item 1, revised ordering

Accepted, no lockout. New order:

1. **Set credentials first.** The variables already exist and are named `ADMIN_SHARED_USERNAME` and `ADMIN_SHARED_PASSWORD`, not `ADMIN_PASSWORD`. You set the real password value; I generate a fresh random `ADMIN_SESSION_SECRET`.
2. **You log in and confirm it works,** while the old fallbacks are still in place as a safety net.
3. **Only then** do I remove `admin123`, `planetbaltimore`, and the session fallback `pb-admin-dev-fallback-secret-please-change`, and close the header backdoor.

**Recovery path if the new secret is wrong.** Rotating `ADMIN_SESSION_SECRET` only invalidates cookies; it cannot lock you out permanently, because login does not use it. Login checks the password, then mints a fresh cookie under whatever the current secret is. So a bad secret means "everyone is signed out and signs in again", not "nobody can ever get in". The genuine lockout risk is a wrong **password**, and there are two independent ways back: your account `terellebony@gmail.com` holds the real admin role in the database and reaches the admin panel without the shared password, and I can reset the shared password variable at any time. Step 2 exists so we discover a problem while the fallback still works.

**Service role key proof.** Pre-checked: variable is `SUPABASE_SERVICE_ROLE_KEY`, no `VITE_` variant exists anywhere in `src/` or `.env`, and all five importers load it dynamically inside handler bodies. The bundle grep needs a build, so it runs during execution and I paste the output.

**Proof of closure:** the anonymous request that returned your member list, re-run, now failing. Plus the log check for prior use of the backdoor.

---

## Item 2, corrected design (you were right)

You are correct: a column-level `REVOKE` on `profiles.email` applies to the whole `authenticated` role, so it would break the five own-row call sites too. Column grants are the wrong instrument. Here is the design, before any migration:

**Three readers, three separate doors.**

| Reader | Door | Mechanism |
|---|---|---|
| Anyone browsing profiles | No email, ever | The public policy stays, but every query is projected to display columns only, and email is revoked from `anon` |
| You reading your own profile | Own email only | A security-definer function `public.my_profile()` returning exactly one row, the caller's, keyed off `auth.uid()` |
| Admin panel | All emails | The existing `admin_list_users` definer function, already in place, unchanged |
| Organizer viewing their buyers | Only their own event's buyers | New definer function `public.event_buyer_contacts(event_id)` that verifies the caller owns the event before returning anything |

A security-definer function is the right tool because it runs with fixed privileges and decides *per caller* what to return, which a static grant cannot do. The email column becomes unreachable through the general profiles table for everyone; the only paths to an email are these three functions, each of which checks who is asking.

**Call sites that change:** the five own-row sites (`use-current-user.ts:28`, `app-layout.tsx:34`, `settings.tsx:117`, `profile.tsx:398`, `stripe.functions.ts:15`) switch from selecting `email` off the table to calling `my_profile()`. They keep working. `organizer-studio.tsx:206` switches to `event_buyer_contacts` and gains an ownership check it does not have today.

**Proof:** anonymous harvest returns no email column; you still see your own email in settings; an organizer sees their buyers; a signed-in non-organizer requesting someone else's event returns nothing.

---

## Item 7, my previous plan was wrong

I checked, and I owe you a correction: **`post-media` is already private.** All five buckets are private. There are zero `getPublicUrl` calls against `post-media`; the only `getPublicUrl` calls anywhere are three against `avatars`. So "making the bucket private breaks every render path" does not apply, and there is no migration of existing files to do. Nothing breaks because nothing is public.

The real problem in that bucket is different, and worse in a quiet way:

- **Ten-year signed links, stored in the database.** Sixteen upload sites mint signed URLs valid for five to ten years and save the whole URL into the row. A signed URL is a bearer token: anyone who ever sees that string can fetch the file for a decade, whatever the post's privacy setting later becomes, and revoking access is impossible without moving the file. This is the actual media leak behind private posts.
- **128 of 180 posts point at `base44.app`,** the previous platform, not at your storage at all. Those images live on someone else's server, outside your control, and cannot be made private by anything we do here. This is also the likeliest cause of the recurring "some images do not load" reports, since that host can change or expire at any time.
- **No file size or type limits on any of the five buckets.** Any signed-in account can upload a file of any size and any type.

**Revised item 7:** store the storage path in the database instead of a long-lived signed URL, mint short-lived signed URLs at render time (the existing `smart-image` component already does exactly this, at one hour, so the pattern is proven), add size and type limits to all five buckets, and give you a separate report on the 128 externally-hosted images so you can decide whether to migrate them. Existing files stay exactly where they are; nothing is deleted or moved.

**Proof:** a private post's image URL, copied and opened in a signed-out browser, fails. Today it succeeds for ten years.

---

## Item 5, the data you asked for

Checked before proposing the constraint:

```text
duplicate stripe_checkout_session_id:  0 rows
tickets total:                         3
  with a checkout session id:          0
  null session id:                     3
  free RSVPs (0 cents):                3
  status = paid:                       3
```

All three tickets are free RSVPs from 28 July with no Stripe session. **No duplicates and no test junk, but also no real payment has ever been processed through this table.** The unique constraint is therefore safe to add and currently protects nothing; it is a guard for the first real sale, not a cleanup. It must be a partial constraint that ignores nulls, or those three free RSVPs collide with each other immediately.

That also means the payment path is **entirely unproven in production**, which I flag as its own risk: item 5 hardens a flow neither of us has seen complete a real charge.

**What triggers the scheduled endpoint, and how often:** a `pg_cron` job inside your database, calling the endpoint over HTTPS with the shared secret header, every 15 minutes. Only orders from the last 24 hours that are still unconfirmed get re-checked, so the job stays cheap regardless of volume. The idempotency key remains the Stripe Checkout Session ID.

---

## Item 4, stated plainly

**Route guards are defense-in-depth, not access control.** A guard runs in the visitor's own browser, and anyone can bypass it by calling the database directly, which is exactly how I demonstrated the email leak. The real protection is items 2 and 3, enforced in the database where the visitor cannot reach. Item 4's honest value is that it stops private content from flashing on screen before the redirect and stops pointless data fetches. If item 4 shipped alone, the app would be exactly as exposed as it is today.

---

## Remaining items, unchanged

3 (private post read rules plus the indirect leaks through comments, likes, notifications, search), 6 (remove the fake attendee-message success), 8 (correct the social preview domain), 9 (repair the broken admin trash tab).

## Execution order

Backup confirmed, then item 1 in the three revised steps, stopping after each for your verification. Nothing batched.