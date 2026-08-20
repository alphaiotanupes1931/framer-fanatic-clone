import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Create (or reuse) a Stripe Express connected account for the signed-in artist. */
export const ensureConnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const { getStripe, isConnectPlatformProfileError } = await import("./stripe.server");
    const stripe = getStripe();

    const { data: profileRows } = await supabase.rpc("my_profile");
    const profile = (profileRows as unknown as Array<{ stripe_account_id: string | null; email: string | null }> | null)?.[0] ?? null;

    let accountId = profile?.stripe_account_id ?? null;

    if (!accountId) {
      let account;
      try {
        account = await stripe.accounts.create({
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
          settings: {
            // Buyers' bank statements read "PLANETBALTIMORE", never the processor.
            payments: { statement_descriptor: "PLANETBALTIMORE" },
          },
        });
      } catch (error) {
        console.error("Payout account creation failed", error);
        const { logStripeError } = await import("./stripe-log.server");
        await logStripeError("api", "connect.account.create", error, { user_id: userId });
        return {
          ok: false as const,
          reason: isConnectPlatformProfileError(error) ? "platform_activation_required" as const : "temporarily_unavailable" as const,
          message: "Payout setup is temporarily unavailable while Planet Baltimore completes payment activation. Please try again later.",
        };
      }
      accountId = account.id;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_account_id: accountId, stripe_account_status: "pending" })
        .eq("id", userId);
    }

    return { ok: true as const, accountId };
  });

/** Generate a fresh onboarding URL for the artist's Stripe Express account. */
export const createConnectOnboardingLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ returnUrl: z.string().url(), refreshUrl: z.string().url() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getStripe, getPayoutAccount } = await import("./stripe.server");
    const stripe = getStripe();

    const profile = await getPayoutAccount(userId);

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
    const { userId } = context;
    const { getStripe, getPayoutAccount } = await import("./stripe.server");
    const stripe = getStripe();

    const profile = await getPayoutAccount(userId);

    if (!profile?.stripe_account_id) return { connected: false, chargesEnabled: false };

    const acct = await stripe.accounts.retrieve(profile.stripe_account_id);
    const chargesEnabled = !!acct.charges_enabled;
    const status = chargesEnabled
      ? "active"
      : acct.details_submitted
        ? "pending_review"
        : "incomplete";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
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
      quantity: z.number().int().min(1).max(100).default(1),
      ticketTypeId: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe, getPayoutAccount, priceBreakdown, checkoutLineItems, CHECKOUT_BRANDING, getSellerDetails, sellerBlurb, refreshChargesEnabled } =
      await import("./stripe.server");
    const stripe = getStripe();

    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, title, user_id, price_cents, image_url, is_published, max_tickets_per_buyer")
      .eq("id", data.eventId)
      .maybeSingle();

    if (evErr || !event) throw new Error("Event not found");
    if (event.is_published === false) throw new Error("Event is not on sale");

    // Events can sell several tiers. When a tier is chosen it defines price and limits.
    let tier: { id: string; name: string; price_cents: number; quantity: number | null; max_per_buyer: number | null; sale_starts_at: string | null; sale_ends_at: string | null } | null = null;
    if (data.ticketTypeId) {
      const { data: tt } = await supabase
        .from("ticket_types")
        .select("id, name, price_cents, quantity, max_per_buyer, sale_starts_at, sale_ends_at, event_id")
        .eq("id", data.ticketTypeId)
        .maybeSingle();
      if (!tt || tt.event_id !== event.id) throw new Error("Ticket type not found for this event.");
      const now = Date.now();
      if (tt.sale_starts_at && new Date(tt.sale_starts_at).getTime() > now) throw new Error("Sales for this ticket type haven't started yet.");
      if (tt.sale_ends_at && new Date(tt.sale_ends_at).getTime() < now) throw new Error("Sales for this ticket type have ended.");
      if (tt.max_per_buyer) {
        const { count: owned } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("ticket_type_id", tt.id)
          .eq("buyer_id", userId)
          .neq("status", "cancelled");
        if ((owned ?? 0) + data.quantity > tt.max_per_buyer) {
          throw new Error(`The organizer limits this ticket to ${tt.max_per_buyer} per person.`);
        }
      }
      if (tt.quantity !== null) {
        const { count } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("ticket_type_id", tt.id)
          .neq("status", "cancelled");
        if ((count ?? 0) + data.quantity > tt.quantity) throw new Error("Not enough tickets left in this tier.");
      }
      tier = tt;
    }

    // Event-level cap set by the organizer (used when the event has no tiers).
    if (!tier && event.max_tickets_per_buyer) {
      const { count: owned } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("buyer_id", userId)
        .neq("status", "cancelled");
      if ((owned ?? 0) + data.quantity > event.max_tickets_per_buyer) {
        throw new Error(`The organizer limits this event to ${event.max_tickets_per_buyer} tickets per person.`);
      }
    }

    const unitPriceCents = tier ? tier.price_cents : (event.price_cents ?? 0);
    if (!unitPriceCents || unitPriceCents <= 0) {
      throw new Error("This is a free ticket - no purchase needed.");
    }

    // Get artist's connected account
    const artist = await getPayoutAccount(event.user_id);

    if (!artist?.stripe_account_id) {
      throw new Error("This organizer hasn't set up payments yet, so tickets can't be sold.");
    }
    // The stored flag can be stale; confirm with Stripe before blocking the sale.
    if (!artist.stripe_charges_enabled && !(await refreshChargesEnabled(event.user_id, artist.stripe_account_id))) {
      throw new Error("This organizer hasn't finished setting up payments yet.");
    }

    const qty = data.quantity;
    // Flat platform fee per ORDER (7¢), never multiplied by ticket quantity, so the
    // breakdown is computed on the full order net rather than a single ticket.
    const breakdown = priceBreakdown(unitPriceCents * qty);
    const applicationFee = breakdown.platformFeeCents;

    // Show the buyer exactly who they are paying, straight from Stripe.
    const seller = await getSellerDetails(artist.stripe_account_id);
    const sellerName = seller?.businessName || artist.display_name || artist.username || "the organizer";
    const sellerLine = sellerBlurb(seller, artist.display_name || artist.username || "the organizer");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${data.returnOrigin}/profile?tab=My%20Tickets&purchase=success`,
      cancel_url: `${data.returnOrigin}/events?purchase=cancelled`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      branding_settings: CHECKOUT_BRANDING,
      custom_text: {
        submit: { message: sellerLine },
      },
      line_items: checkoutLineItems(breakdown, {
        name: `${tier ? `${tier.name} - ${event.title}` : `Ticket: ${event.title}`}${qty > 1 ? ` x${qty}` : ""}`,
        description: `${event.title} · Sold by ${sellerName} via Planet Baltimore`,
        images: event.image_url ? [event.image_url] : undefined,
      }),
      payment_intent_data: {
        application_fee_amount: applicationFee,
        on_behalf_of: artist.stripe_account_id,
              transfer_data: { destination: artist.stripe_account_id },
        description: `${event.title} — ${sellerName}`,
      },
      metadata: {
        event_id: event.id,
        buyer_id: userId,
        artist_id: event.user_id,
        kind: "ticket",
        quantity: String(qty),
        ticket_type_id: tier?.id ?? "",
        artist_net_cents: String(breakdown.artistNetCents),
        platform_tax_cents: String(breakdown.platformTaxCents),
        stripe_fee_cents: String(breakdown.stripeFeeCents),
        buyer_total_cents: String(breakdown.buyerTotalCents),
      },
    });

    // Pre-create one pending ticket row per seat. Buyers have no insert rights
    // on tickets (they may only read their own), so this write must go through
    // the admin client after the caller has been authenticated above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Order-level totals split across seats; any remainder lands on the first row.
    const split = (total: number, i: number) => Math.floor(total / qty) + (i === 0 ? total % qty : 0);
    const rows = Array.from({ length: qty }, (_, i) => ({
      event_id: event.id,
      buyer_id: userId,
      artist_id: event.user_id,
      stripe_checkout_session_id: session.id,
      buyer_total_cents: split(breakdown.buyerTotalCents, i),
      artist_net_cents: unitPriceCents,
      platform_tax_cents: split(breakdown.platformTaxCents, i),
      stripe_fee_cents: split(breakdown.stripeFeeCents, i),
      ticket_type_id: tier?.id ?? null,
      ticket_type_name: tier?.name ?? null,
      status: "pending",
    }));
    const { error: ticketErr } = await supabaseAdmin.from("tickets").insert(rows);
    if (ticketErr) throw new Error("Could not reserve your ticket. Please try again.");

    return { url: session.url, quantity: qty };
  });

/** Check whether an organization's owner has Stripe Connect ready to accept payments. */
export const getOrgPaymentStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ orgId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_id, name, slug")
      .eq("id", data.orgId)
      .maybeSingle();
    if (!org) throw new Error("Organization not found");
    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_charges_enabled")
      .eq("id", org.owner_id)
      .maybeSingle();
    return {
      ready: !!(owner?.stripe_account_id && owner.stripe_charges_enabled),
      orgName: org.name,
      orgSlug: org.slug,
    };
  });

/** Create a Stripe Checkout Session for a one-time donation to an organization. */
export const createOrgDonationCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      orgId: z.string().uuid(),
      amountCents: z.number().int().min(100).max(5_000_000),
      returnOrigin: z.string().url(),
      note: z.string().max(280).optional(),
      interval: z.enum(["once", "monthly", "yearly"]).default("once"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe, getPayoutAccount, priceBreakdown, checkoutLineItems, CHECKOUT_BRANDING } =
      await import("./stripe.server");
    const stripe = getStripe();

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, name, slug")
      .eq("id", data.orgId)
      .maybeSingle();
    if (!org) throw new Error("Organization not found");

    const owner = await getPayoutAccount(org.owner_id);
    if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) {
      throw new Error("This organization has not yet set up a payment method.");
    }

    const breakdown = priceBreakdown(data.amountCents);

    const recurring = data.interval !== "once";
    const metadata = {
      kind: "donation",
      org_id: org.id,
      donor_id: userId,
      owner_id: org.owner_id,
      amount_cents: String(data.amountCents),
      interval: data.interval,
    };
    const productName = recurring
      ? `${data.interval === "yearly" ? "Yearly" : "Monthly"} support for ${org.name}`
      : `Donation to ${org.name}`;
    // Application fee is a share of the total so it holds on every renewal.
    const feePercent = Math.min(
      50,
      Math.round((breakdown.platformFeeCents / breakdown.buyerTotalCents) * 10000) / 100,
    );

    const session = await stripe.checkout.sessions.create({
      mode: recurring ? "subscription" : "payment",
      success_url: `${data.returnOrigin}/o/${org.slug}?donation=success`,
      cancel_url: `${data.returnOrigin}/o/${org.slug}/donate?cancelled=1`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      branding_settings: CHECKOUT_BRANDING,
      line_items: recurring
        ? [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: breakdown.buyerTotalCents,
            product_data: {
              name: productName,
              description: data.note?.trim() ? data.note.trim().slice(0, 200) : undefined,
            },
            ...(recurring
              ? { recurring: { interval: data.interval === "yearly" ? ("year" as const) : ("month" as const) } }
              : {}),
          },
        },
          ]
        : checkoutLineItems(breakdown, {
            name: productName,
            description: data.note?.trim() ? data.note.trim().slice(0, 200) : undefined,
          }),
      ...(recurring
        ? {
            subscription_data: {
              application_fee_percent: feePercent,
              on_behalf_of: owner.stripe_account_id,
              transfer_data: { destination: owner.stripe_account_id },
              metadata,
            },
          }
        : {
            payment_intent_data: {
              application_fee_amount: breakdown.platformFeeCents,
              on_behalf_of: owner.stripe_account_id,
              transfer_data: { destination: owner.stripe_account_id },
            },
          }),
      metadata,
    });

    return { url: session.url };
  });

/** Create a Stripe Checkout Session for buying a listed artwork (Available Works). */
export const createArtworkCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      workId: z.string().uuid(),
      returnOrigin: z.string().url(),
      shippingNote: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe, getPayoutAccount, priceBreakdown, checkoutLineItems, CHECKOUT_BRANDING } =
      await import("./stripe.server");
    const stripe = getStripe();

    const { data: work } = await supabase
      .from("profile_sections")
      .select("id, user_id, title, subtitle, year, media_url, link_url, kind")
      .eq("id", data.workId)
      .maybeSingle();
    if (!work || work.kind !== "available_work") throw new Error("Artwork not found");

    // Parse metadata JSON stored in link_url: { price_cents, edition, status }
    let meta: { price_cents?: number; edition?: string; status?: string } = {};
    try { meta = work.link_url ? JSON.parse(work.link_url) : {}; } catch { meta = {}; }
    const priceCents = Number(meta.price_cents ?? 0);
    if (!priceCents || priceCents < 100) throw new Error("This work is not priced for sale.");
    if (meta.status && meta.status !== "available") throw new Error("This work is no longer available.");

    const owner = await getPayoutAccount(work.user_id);
    if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) {
      throw new Error("This artist has not set up a payment method yet.");
    }

    const breakdown = priceBreakdown(priceCents);
    const artistHandle = owner.username || owner.display_name || "artist";
    const details = [work.subtitle, work.year, meta.edition].filter(Boolean).join(" \u00b7 ");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${data.returnOrigin}/u/${artistHandle}?purchase=success`,
      cancel_url: `${data.returnOrigin}/u/${artistHandle}?purchase=cancelled`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      branding_settings: CHECKOUT_BRANDING,
      line_items: checkoutLineItems(breakdown, {
        name: work.title || "Original artwork",
        description: details || undefined,
        images: work.media_url ? [work.media_url] : undefined,
      }),
      payment_intent_data: {
        application_fee_amount: breakdown.platformFeeCents,
        on_behalf_of: owner.stripe_account_id,
              transfer_data: { destination: owner.stripe_account_id },
      },
      metadata: {
        kind: "artwork",
        work_id: work.id,
        artist_id: work.user_id,
        buyer_id: userId,
        amount_cents: String(priceCents),
        shipping_note: (data.shippingNote ?? "").slice(0, 400),
      },
    });

    return { url: session.url };
  });

/** Create a Stripe Checkout Session for buying a product from a page's store. */
export const createProductCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20).default(1),
      returnOrigin: z.string().url(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { getStripe, getPayoutAccount, priceBreakdown, checkoutLineItems, CHECKOUT_BRANDING } =
      await import("./stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stripe = getStripe();

    const { data: product } = await supabaseAdmin
      .from("organization_products")
      .select("id, org_id, name, description, price_cents, image_url, inventory, is_active")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product || !product.is_active) throw new Error("This product is no longer available.");
    if (product.inventory != null && product.inventory < data.quantity) {
      throw new Error("Not enough stock left for this product.");
    }
    if (!product.price_cents || product.price_cents < 100) {
      throw new Error("This product is not priced for sale.");
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_id, name, slug")
      .eq("id", product.org_id)
      .maybeSingle();
    if (!org) throw new Error("Page not found");

    const owner = await getPayoutAccount(org.owner_id);
    if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) {
      throw new Error("This page has not set up a payment method yet.");
    }

    const net = product.price_cents * data.quantity;
    const breakdown = priceBreakdown(net);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${data.returnOrigin}/o/${org.slug}?purchase=success`,
      cancel_url: `${data.returnOrigin}/o/${org.slug}?purchase=cancelled`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      branding_settings: CHECKOUT_BRANDING,
      shipping_address_collection: { allowed_countries: ["US"] },
      line_items: checkoutLineItems(breakdown, {
        name: data.quantity > 1 ? `${product.name} x${data.quantity}` : product.name,
        description: product.description ?? undefined,
        images: product.image_url ? [product.image_url] : undefined,
      }),
      payment_intent_data: {
        application_fee_amount: breakdown.platformFeeCents,
        on_behalf_of: owner.stripe_account_id,
              transfer_data: { destination: owner.stripe_account_id },
      },
      metadata: {
        kind: "product",
        product_id: product.id,
        org_id: org.id,
        seller_id: org.owner_id,
        buyer_id: userId,
        quantity: String(data.quantity),
        amount_cents: String(net),
      },
    });

    await supabaseAdmin.from("product_orders").insert({
      product_id: product.id,
      org_id: org.id,
      seller_id: org.owner_id,
      buyer_id: userId,
      quantity: data.quantity,
      buyer_total_cents: breakdown.buyerTotalCents,
      seller_net_cents: breakdown.artistNetCents,
      platform_fee_cents: breakdown.platformFeeCents,
      stripe_fee_cents: breakdown.stripeFeeCents,
      status: "pending",
      stripe_checkout_session_id: session.id,
    } as never);

    return { url: session.url };
  });

/** Upgrade the signed-in user to artist. Open to anyone; no location check. */
export const becomeArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ role: "resident" } as never)
      .eq("id", userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "artist" });
    if (error && !String(error.message).includes("duplicate")) throw error;
    return { ok: true };
  });

/** RSVP to a free event. Creates a confirmed zero-cost ticket for the signed-in user. */
export const rsvpFreeEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: event, error: evErr } = await supabase
      .from("events")
      .select("id, user_id, price_cents, is_published")
      .eq("id", data.eventId)
      .maybeSingle();
    if (evErr || !event) throw new Error("Event not found");
    if (event.is_published === false) throw new Error("Event is not available");
    if ((event.price_cents ?? 0) > 0) throw new Error("This event requires a paid ticket.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Idempotent: if the user already RSVPed, just return ok.
    const { data: existing } = await supabaseAdmin
      .from("tickets")
      .select("id")
      .eq("event_id", event.id)
      .eq("buyer_id", userId)
      .maybeSingle();
    if (existing) return { ok: true, alreadyRsvped: true };

    const { error } = await supabaseAdmin.from("tickets").insert({
      event_id: event.id,
      buyer_id: userId,
      artist_id: event.user_id,
      buyer_total_cents: 0,
      artist_net_cents: 0,
      platform_tax_cents: 0,
      stripe_fee_cents: 0,
      status: "paid",
    });
    if (error) throw error;
    return { ok: true };
  });

/** Create a Stripe Checkout Session for a community association dues payment. */
export const createDuesCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tierId: z.string().uuid(),
      returnOrigin: z.string().url(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { getStripe, getPayoutAccount, priceBreakdown, checkoutLineItems, CHECKOUT_BRANDING } =
      await import("./stripe.server");
    const stripe = getStripe();

    const { data: tier, error: tErr } = await supabase
      .from("organization_dues_tiers")
      .select("id, org_id, name, amount_cents, interval, is_active")
      .eq("id", data.tierId)
      .maybeSingle();
    if (tErr || !tier) throw new Error("Dues tier not found");
    if (!tier.is_active) throw new Error("This dues tier isn't available.");

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, name, slug")
      .eq("id", tier.org_id)
      .maybeSingle();
    if (!org) throw new Error("Organization not found");

    const owner = await getPayoutAccount(org.owner_id);
    if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) {
      throw new Error("This association's payout account isn't ready yet. Please try again later.");
    }

    const breakdown = priceBreakdown(tier.amount_cents);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${data.returnOrigin}/o/${org.slug}?dues=success`,
      cancel_url: `${data.returnOrigin}/o/${org.slug}?dues=cancelled`,
      customer_email: (context.claims as { email?: string } | null)?.email,
      branding_settings: CHECKOUT_BRANDING,
      line_items: checkoutLineItems(breakdown, {
        name: `${org.name} Dues: ${tier.name}`,
        description: `Dues payment (${tier.interval.replace("_", " ")})`,
      }),
      payment_intent_data: {
        application_fee_amount: breakdown.platformFeeCents,
        on_behalf_of: owner.stripe_account_id,
              transfer_data: { destination: owner.stripe_account_id },
      },
      metadata: {
        kind: "dues",
        dues_tier_id: tier.id,
        org_id: org.id,
        member_id: userId,
        owner_id: org.owner_id,
      },
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("organization_dues_payments").insert({
      org_id: org.id,
      tier_id: tier.id,
      member_id: userId,
      owner_id: org.owner_id,
      amount_cents: tier.amount_cents,
      buyer_total_cents: breakdown.buyerTotalCents,
      owner_net_cents: breakdown.artistNetCents,
      platform_fee_cents: breakdown.platformFeeCents,
      stripe_fee_cents: breakdown.stripeFeeCents,
      interval: tier.interval,
      status: "pending",
      stripe_checkout_session_id: session.id,
    });

    return { url: session.url };
  });