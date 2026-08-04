# Security Remediation, Revision 2

Waiting on your export confirmation. Nothing runs until you say so. All five corrections folded in below, plus one new finding that changes item 5.

---

## Item 1, proving the *specific* password

You are right that logging in while `admin123` is still live proves nothing. Revised three steps:

**Step 1.** You set the real value of `ADMIN_SHARED_PASSWORD`. I generate a fresh random `ADMIN_SESSION_SECRET`. I also add one temporary line to the login handler that reports *which* credential matched, as a label only, never the value: `matched: "env" | "legacy-admin123" | "legacy-planetbaltimore"`.

**Step 2.** You log in. The response must read `matched: "env"`. If it reads `legacy-anything`, your new password did not take and we fix that before going further. The fallbacks are still live during this step, so there is no lockout window.

**Step 3.** I remove the two literal fallbacks, remove the session-secret fallback, remove the temporary label, and close the header backdoor. You log in once more to confirm.

Before I touch the database, I paste the current `is_admin_caller` definition verbatim in chat, as promised, so you hold the exact rollback text.

---

## Item 2, the five call-site diffs, before the migration

Your shape objection is correct, and it points at the right design. `my_profile()` will return **the full own-row profile, same columns, one row**, not just an email. So each call site changes only how it asks, not what it gets back:

```text
.from("profiles").select("id, email, ...").eq("id", uid).maybeSingle()
   becomes
.rpc("my_profile").maybeSingle()
```

Both give you a single object or null. Site by site:

| File | Line | Today | After | Shape change |
|---|---|---|---|---|
| `use-current-user.ts` | 28 | selects 10 columns incl. email | `rpc("my_profile")` | none, still one object |
| `app-layout.tsx` | 34 | selects 14 columns incl. email | `rpc("my_profile")` | none, function returns all 14 |
| `settings.tsx` | 117 | reads `profile.email` from the layout object | unchanged | none, it consumes the object above |
| `profile.tsx` | 398 | reads `profile.email` from the same object | unchanged | none |
| `stripe.functions.ts` | 15 | server-side, selects `stripe_account_id, email` | unchanged | none, it runs as the signed-in user through the auth middleware and already has an ownership scope |

So three files actually change, two consume the result and need no edit. The function returns the union of every column those call sites request, which is why the shape holds. I will show you the real diffs before the migration runs.

**`event_buyer_contacts` non-owner behaviour.** You are right to insist on this. It will return **zero rows, not an error**. A signed-in non-owner passing someone else's `event_id` gets an empty result that is byte-identical to "this event has no buyers", so the response cannot be used to probe which events exist or which have sales. Test matrix I will run and paste: owner sees buyers, non-owner on a real event with real buyers sees nothing, non-owner on a nonexistent event sees nothing, signed-out sees nothing. All four must look the same from outside except the first.

---

## Item 7, the two answers you asked for

### Do the existing ten-year links die when we store paths instead?

**No. Re-storing paths does not revoke anything.** This matters, so plainly: a signed URL is a self-contained token. It carries the file path and an expiry, signed with the project's storage key. Nothing checks a database row when that URL is opened, so removing the URL from your database only removes *your* copy of it. Anyone who already saved the string keeps working access until 2035 or 2036.

There are exactly three ways to actually kill an existing signed link:

1. **Move or rename the file.** The token is signed over the old path, so it stops matching. This is the surgical option and the one I recommend.
2. **Delete the file.** Kills the link and the content.
3. **Rotate the project storage key.** Kills every signed URL at once, including working ones across all five buckets, and is disruptive.

So the honest scope of item 7 is: switching to short-lived URLs protects everything from that point forward, and any file that must be retroactively protected has to be **copied to a new path and the old object deleted**. I will do that for post media attached to non-public posts, report the count first, and leave public content in place since there is nothing to protect there.

### The base44 report, as a forwardable deliverable

I cannot write files in planning mode, so the CSV gets generated the moment we start. Here is what it will contain, already measured:

```text
external media still hosted on base44.app
  post images              128
  event images              12
  profile avatars           11
  profile banners            8
  organization avatars       5
  organization banners       4
  story covers               3
  ---------------------------------
  total records            171
```

**Live status: confirmed serving.** I fetched one and it returned a 200 with a real JPEG. It also came back at **4.2 MB for a single post image**, which is a second problem: nothing on the site resizes these, so every visitor downloads multi-megabyte originals. That is very likely a large part of the slowness you have been reporting.

The deliverable will be a CSV with one row per record: content type, record id, a human label (post excerpt, event title, person or organization name), the external URL, and the created date, so the client can see exactly which items are affected.

**What migrating them takes:** download each of the 171 files, resize and re-encode to sane web sizes, upload to your own storage, and rewrite the database field to the new path. It is a single scripted pass, roughly one working session, and it is safe to run incrementally because each record is independent. The risk of *not* doing it is that base44 is someone else's account: if it lapses, 171 images across your posts, events, profiles and organizations go blank at once, with no way to recover them.

---

## Item 5, corrected: the scheduler does not exist yet

I checked before answering, and the honest answer is different from what I told you:

```text
pg_cron   available 1.6.4    installed: NO
pg_net    available 0.20.3   installed: NO
cron.job  relation does not exist
```

**Neither extension is enabled, and there are no scheduled jobs on this database at all.** So "what triggers the endpoint" today is: nothing. Item 5 has to enable `pg_cron` and `pg_net` first, then create the job. Every 15 minutes, re-checking only unconfirmed orders from the last 24 hours, as described.

**Where the secret lives: Vault is available, so we use it.** I checked. `supabase_vault` version 0.3.1 is installed and the `vault` schema exists. It is also correctly locked down: my restricted database role gets `permission denied for schema vault`, which is exactly what you want to see.

So your objection is accepted in full and the design changes. A `pg_cron` job body is stored as plaintext in the `cron.job` table, so the secret never goes in it. Instead:

1. The shared secret is generated and stored in Vault under a named entry.
2. The cron job body contains a *lookup*, not a value: it selects the decrypted secret from Vault at run time and puts it in the request header. Anyone who reads `cron.job` sees the query, not the secret.
3. The endpoint rejects any request whose header does not match, before it does anything else.

That closes the surface you identified. You are right that an `apikey`-only endpoint is an unauthenticated cost surface even when it is not a fraud surface: every anonymous call would fan out to Stripe, and someone looping it costs you Stripe rate-limit budget and response time for nothing. With the Vault secret required up front, an unauthenticated caller is rejected before a single outbound Stripe call is made, so the fan-out surface is gone rather than rate-limited.

The endpoint stays idempotent and confirm-only on top of that, so even a leaked secret cannot create a ticket for an unpaid order.

**Constraint confirmed partial:**

```sql
CREATE UNIQUE INDEX tickets_stripe_session_unique
  ON public.tickets (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
```

Without the `WHERE`, your three existing free RSVPs, which all hold a null session, collide immediately. Idempotency key stays the Stripe Checkout Session ID.

---

## Item 4, unchanged and stated plainly

Route guards are **defense-in-depth, not access control**. They run in the visitor's browser and are bypassable by calling the database directly, which is exactly how I demonstrated the email leak. The real protection is items 2 and 3, enforced in the database. Item 4 alone would leave the app exactly as exposed as it is today; its honest value is preventing content flash and wasted fetches.

---

## Backup, still your gate

Export confirmed by you. Restore path is a manual re-import of that export. Every migration is written to be individually reversible: policy and function changes only, no dropped columns, no deleted rows.

**Item 7 deletion is gated, as you asked.** Sequence is: produce the count, produce the CSV of affected objects, hand both to you, stop. Deletion is a separate step that only happens on your explicit approval, after you have read the list. Nothing in storage is removed before that.

**The base44 CSV ships early and standalone.** It is not part of the remediation gate. I generate it as the first action of execution so you can forward it to the client immediately, together with the finding that a single post image measured 4.2 MB unresized and nothing on the site resizes uploads.

## Order

Item 1 step 1 alone, then stop. Nothing batched.