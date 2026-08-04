# Security and Launch-Blocker Remediation

Gated execution. One item at a time. After each item I stop, show you the exact request or click that proves the hole is closed, and wait for your go-ahead before the next. Migrations are never batched.

---

## Item 1 (first, alone): close the admin backdoor

Today an anonymous caller can act as an administrator by sending one fixed header value that is committed in the source code. Verified live: that request returned the full member list with email addresses.

**Changes**
- Rewrite the `is_admin_caller` database function to remove the header branch entirely. Admin status comes only from a real signed-in admin role or trusted server-side access.
- Change `src/lib/admin-supabase.server.ts` to use the privileged server client instead of the public key plus the leaked header.
- Remove the hardcoded fallback passwords (`admin123`, `planetbaltimore`) from `src/lib/admin-site.functions.ts`. Admin login fails closed if the real password is not configured.
- **Rotate the admin session secret.** The old code fell back to a publicly visible string, so every admin cookie and token ever issued is forgeable. Generate a new random `ADMIN_SESSION_SECRET`, remove the fallback in `src/lib/admin-session.server.ts`, and fail closed when it is unset. Rotating the signing key invalidates every existing admin session and token by design, so you will be signed out and must log in again.

**Service role key proof (pre-checked, will re-prove after the change)**
- The variable is `SUPABASE_SERVICE_ROLE_KEY`. There is no `VITE_` version anywhere: `rg "VITE_.*SERVICE"` across `src/` and `.env` returns nothing, and `.env` contains no service key at all.
- It is read only inside `src/integrations/supabase/client.server.ts`, and all five importers use `await import(...)` inside a handler body, never at module scope.
- Remaining proof needs a production build, which is a state change, so it runs during execution: build, then grep the emitted client assets for the key value and for the string `SERVICE_ROLE`. Expected result: zero matches. I will paste that output.

**Backdoor usage investigation**
Check the Supabase API/auth logs and the dev-server logs for requests carrying the `x-admin-secret` header or anonymous calls to the `admin_*` functions, and report honestly what I find, including "logs do not retain enough history to tell", if that is the answer. This determines whether you have a disclosure obligation.

**Proof the hole is closed**
The exact anonymous request that previously returned your member list, re-run and now failing. Before: it returned real user emails. After: it must return an empty result or a permission error.

**STOP. You verify. You tell me to proceed.**

---

## Item 2: stop exposing member email addresses

Public profile reads currently return every column, including `email`. Restrict anonymous and other-user reads to display fields only. Email stays readable by the account owner and by admins.

**Call sites that read a profile email (already enumerated)**

Survives unchanged, because it reads the signed-in user's own row:
- `src/hooks/use-current-user.ts:28`
- `src/components/app-layout.tsx:34`
- `src/routes/settings.tsx:117`
- `src/routes/profile.tsx:398-401`
- `src/lib/stripe.functions.ts:15` (runs as the user via auth middleware)

Survives, because it goes through an admin-only database function, not a direct table read:
- `src/routes/admin.index.tsx:261,557` and the CSV export at line 194

**Will break, and should:**
- `src/routes/organizer-studio.tsx:206` reads other people's emails straight from the browser. This single query is why organizers can see buyer emails, and it is the same door anyone else can walk through. It gets replaced with a server function that returns buyer emails only for events the caller actually organizes. This affects the attendee table (line 317), attendee search (line 369), the CSV export (lines 240-242), and the recipient list passed to the message tab (line 340).

**Proof:** the anonymous email-harvest request returns profiles with no email field, while an organizer still sees their own buyers' emails and a non-organizer gets nothing.

**STOP.**

---

## Items 3 and 7 together: private posts, including their media

Shipped as one change, because a private post whose image is still fetchable by URL is not private.

- Rewrite the post read rule so `only_me`, `close_friends`, and `followers` visibility is enforced in the database rather than hidden in the interface.
- Restrict the `post-media` bucket so its files are not readable by every signed-in account. Add file size caps and allowed file types to all five buckets, which currently have neither.

**Indirect leak sweep (part of this item, not an afterthought)**
A private post can leak through everything that points at it. Each of these gets checked and fixed in the same change:
- Comments on private posts (`post_comments` read rule is currently open to all)
- Likes on private posts (`post_likes` read rule is currently open to all, and reveals who engaged)
- Notifications that quote or link a private post
- Search and feed queries that join posts
- The post counters, which can reveal that hidden activity exists

**Proof:** create a post set to "only me" with an image, then from a signed-out browser and from a second signed-in account attempt (a) the post row, (b) the image URL directly, (c) its comments and likes. All must fail.

**STOP.**

---

## Item 4: real protection on signed-in pages

Ten pages currently let the page load and fetch data first, then redirect. Move them behind a proper gate that runs before anything renders.

- **URLs do not change.** The gate uses a pathless layout: the folder segment is stripped from the address, so `/dashboard` stays `/dashboard`. Nothing you have shared or bookmarked breaks, and no redirects are needed.
- **The destination is preserved.** Someone opening a link to a signed-in page while logged out is sent to the login screen, and after signing in lands on the page they originally wanted, not on a generic home page. Only same-site destinations are accepted, so the parameter cannot be abused to bounce people to an outside site.

**Proof:** in a signed-out private window, open a deep link to a signed-in page. You should reach the login screen with no flash of private content, and land on that exact page after signing in.

**STOP.**

---

## Item 5: payment safety net

If Stripe's confirmation never arrives, a buyer is charged and never receives a ticket. Add a scheduled endpoint that re-checks recent unconfirmed orders directly with Stripe and completes them.

- **The endpoint requires a shared secret header.** It lives under the public route prefix, so it is reachable from the internet and must authenticate its caller. Requests without the correct secret get a 401 before any work happens. I will generate the secret; it is never placed in front-end code.
- **Fulfilment is idempotent.** The idempotency key is the **Stripe Checkout Session ID**, stored on the order as `tickets.stripe_checkout_session_id`. Both the webhook and the scheduled job complete an order with a conditional update that matches on that session ID *and* requires the order to not already be marked paid. Whichever arrives second changes zero rows and exits without issuing anything. The database enforces this with a uniqueness constraint on that column, so a duplicate ticket cannot be created even under a simultaneous race. Confirmation notices are only sent for a row that the update actually changed.

**Proof:** run the scheduled endpoint twice in a row against the same unconfirmed order. The first completes it and sends one confirmation. The second reports zero rows changed and sends nothing. Calling the endpoint without the secret header returns 401.

**STOP.**

---

## Item 6: remove the fake "message attendees" send

The Organizer Studio shows "Message queued for N attendees" over code that waits 400 milliseconds and sends nothing. Disable the control with honest wording until a real email provider exists.

**Proof:** the button no longer produces a false success message.

**STOP.**

---

## Item 8: correct the social preview domain

The link preview points at an old placeholder domain, so shared links show a broken image everywhere. One-line fix.

**Proof:** the page source shows your real domain in the preview image tag.

**STOP.**

---

## Item 9: repair the broken admin trash page

The admin panel calls four database functions that do not exist, so the Trash tab errors. Either build them or remove the tab. The "feature this post" action has the mirror-image problem: the function exists but is missing from the server's allow-list.

**Proof:** open the Trash tab and the Feature action without an error.

---

## Technical notes
- Migrations, one per item, never combined: item 1 `is_admin_caller`; item 2 `profiles` select policy plus column grants; items 3+7 `posts`/`post_comments`/`post_likes` policies, bucket limits, `post-media` policy; item 5 the unique constraint on `tickets.stripe_checkout_session_id`.
- Item 1 also needs a new random `ADMIN_SESSION_SECRET`; item 5 needs a new random shared secret for the scheduled endpoint. Both are generated, never typed by you.
- Item 4 introduces `src/routes/_authenticated/route.tsx` and moves `dashboard`, `saved`, `notifications`, `messages`, `onboarding`, `invite`, `leaderboard`, `marketplace`, `settings`, and `profile` beneath it.

## Still needs you, outside this plan
Connecting an email provider and verifying a sending domain, confirming Stripe is on live keys, deleting the 3 seed accounts and 6 fake organisation phone numbers, and deciding on analytics. Details are in the audit's "Needs a human" section.