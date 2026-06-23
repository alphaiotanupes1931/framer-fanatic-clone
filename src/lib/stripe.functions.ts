import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Create (or reuse) a Stripe Express connected account for the signed-in artist. */
export const ensureConnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, email")
      .eq("id", userId)
      .maybeSingle();

    let accountId = profile?.stripe_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: profile?.email ?? (claims as { email?: string })?.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: "7929", // Bands, orchestras, and miscellaneous entertainers
        },
      });
      accountId = account.id;
      await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId, stripe_account_status: "pending" })
        .eq("id", userId);
    }

    return { accountId };
  });

/** Generate a fresh onboarding URL for the artist's Stripe Express account. */
export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ returnUrl: z.string().url(), refreshUrl: z.string().url() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.stripe_account_id) {
      throw new Error("No Stripe account on file. Click Connect Stripe first.");
    }

    const link = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      return_url: data.returnUrl,
      refresh_url: data.refreshUrl,
      type: "account_onboarding",
    });

    return { url: link.url };
  });

/** Pull the latest Stripe account state and update the profile. */
export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.stripe_account_id) return { connected: false, chargesEnabled: false };

    const acct = await stripe.accounts.retrieve(profile.stripe_account_id);
    const chargesEnabled = !!acct.charges_enabled;
    const status = chargesEnabled
      ? "active"
      : acct.details_submitted
        ? "pending_review"
        : "incomplete";

    await supabase
      .from("profiles")
      .update({ stripe_charges_enabled: chargesEnabled, stripe_account_status: status })
      .eq("id", userId);

    return { connected: true, chargesEnabled, status };
  });

/** Create a Stripe Checkout Session for buying a ticket to an event. */
export const createTicketCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      eventId: z.string().uuid(),
      returnOrigin: z.string().url(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe, priceBreakdown } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, title, user_id, price_cents, image_url, is_published")
      .eq("id", data.eventId)
      .maybeSingle();

    if (evErr || !event) throw new Error("Event not found");
    if (event.is_published === false) throw new Error("Event is not on sale");
    if (!event.price_cents || event.price_cents <= 0) {
      throw new Error("This is a free event - no ticket purchase needed.");
    }

    // Get artist's connected account
    const { data: artist } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("id", event.user_id)
      .maybeSingle();

    if (!artist?.stripe_account_id || !artist.stripe_charges_enabled) {
      throw new Error("This artist hasn't finished setting up payments yet.");
    }

    const breakdown = priceBreakdown(event.price_cents);
    // Platform fee = Baltimore tax. Routed to platform Stripe via application_fee_amount.
    const applicationFee = breakdown.platformTaxCents;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${data.returnOrigin}/profile?tab=My%20Tickets&purchase=success`,
      cancel_url: `${data.returnOrigin}/events?purchase=cancelled`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: breakdown.buyerTotalCents,
            product_data: {
              name: `Ticket: ${event.title}`,
              images: event.image_url ? [event.image_url] : undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: artist.stripe_account_id },
      },
      metadata: {
        event_id: event.id,
        buyer_id: userId,
        artist_id: event.user_id,
        artist_net_cents: String(breakdown.artistNetCents),
        platform_tax_cents: String(breakdown.platformTaxCents),
        stripe_fee_cents: String(breakdown.stripeFeeCents),
        buyer_total_cents: String(breakdown.buyerTotalCents),
      },
    });

    // Pre-create the ticket as pending
    await supabase.from("tickets").insert({
      event_id: event.id,
      buyer_id: userId,
      artist_id: event.user_id,
      stripe_checkout_session_id: session.id,
      buyer_total_cents: breakdown.buyerTotalCents,
      artist_net_cents: breakdown.artistNetCents,
      platform_tax_cents: breakdown.platformTaxCents,
      stripe_fee_cents: breakdown.stripeFeeCents,
      status: "pending",
    });

    return { url: session.url };
  });

/** Upgrade the signed-in user from attendee to artist (Baltimore-verified only). */
export const becomeArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("in_baltimore, latitude, longitude, is_baltimore_verified, geo_lat, geo_lng")
      .eq("id", userId)
      .maybeSingle();

    // Treat any user with a captured Baltimore-area lat/lng as verified.
    const lat = (profile as { latitude?: number | null; geo_lat?: number | null } | null)?.latitude
      ?? (profile as { geo_lat?: number | null } | null)?.geo_lat
      ?? null;
    const lng = (profile as { longitude?: number | null; geo_lng?: number | null } | null)?.longitude
      ?? (profile as { geo_lng?: number | null } | null)?.geo_lng
      ?? null;
    const inBaltimoreFlag = (profile as { in_baltimore?: boolean; is_baltimore_verified?: boolean } | null)?.in_baltimore
      || (profile as { is_baltimore_verified?: boolean } | null)?.is_baltimore_verified;
    const inBaltimore =
      inBaltimoreFlag === true ||
      (lat != null && lng != null && lat >= 39.2 && lat <= 39.38 && lng >= -76.72 && lng <= -76.52);

    if (!inBaltimore) {
      throw new Error("Artist accounts are limited to Baltimore-area residents.");
    }

    // Service-role insert to bypass user_roles RLS for self-upgrade.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "artist" });
    // Ignore unique-violation (already an artist)
    if (error && !String(error.message).includes("duplicate")) throw error;
    return { ok: true };
  });