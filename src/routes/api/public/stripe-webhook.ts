import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();
        const sig = request.headers.get("stripe-signature") ?? "";
        const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const body = await request.text();

        let event: import("stripe").Stripe.Event;
        try {
          if (!whSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
          event = stripe.webhooks.constructEvent(body, sig, whSecret);
        } catch (err) {
          console.error("Stripe webhook signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (event.type === "checkout.session.completed") {
            const session = event.data.object as import("stripe").Stripe.Checkout.Session;
            const paymentIntentId = typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;
            const isDues = session.metadata?.kind === "dues";
            const isDonation = session.metadata?.kind === "donation";
            if (isDonation) {
              const ownerId = session.metadata?.owner_id ?? null;
              const donorId = session.metadata?.donor_id ?? null;
              const orgId = session.metadata?.org_id ?? null;
              const amountCents = Number(session.metadata?.amount_cents ?? "0") || 0;
              if (ownerId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: ownerId,
                  actor_id: donorId,
                  type: "donation_received",
                  target_type: "organization",
                  target_id: orgId,
                  message: `You received a $${(amountCents / 100).toFixed(2)} donation.`,
                  metadata: { org_id: orgId, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              if (donorId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: donorId,
                  actor_id: null,
                  type: "donation_sent",
                  target_type: "organization",
                  target_id: orgId,
                  message: "Thank you! Your donation is confirmed.",
                  metadata: { org_id: orgId, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              return new Response("ok");
            }
            if (session.metadata?.kind === "artwork") {
              const artistId = session.metadata?.artist_id ?? null;
              const buyerId = session.metadata?.buyer_id ?? null;
              const workId = session.metadata?.work_id ?? null;
              const amountCents = Number(session.metadata?.amount_cents ?? "0") || 0;
              // Mark work as sold by updating the JSON status in link_url
              if (workId) {
                const { data: work } = await supabaseAdmin
                  .from("profile_sections")
                  .select("link_url")
                  .eq("id", workId)
                  .maybeSingle();
                let meta: Record<string, unknown> = {};
                try { meta = work?.link_url ? JSON.parse(work.link_url) : {}; } catch { meta = {}; }
                meta.status = "sold";
                meta.sold_at = new Date().toISOString();
                meta.buyer_id = buyerId;
                meta.payment_intent = paymentIntentId;
                await supabaseAdmin
                  .from("profile_sections")
                  .update({ link_url: JSON.stringify(meta) })
                  .eq("id", workId);
              }
              if (artistId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: artistId,
                  actor_id: buyerId,
                  type: "artwork_sold",
                  target_type: "profile_section",
                  target_id: workId,
                  message: `You sold an artwork for $${(amountCents / 100).toFixed(2)}.`,
                  metadata: { work_id: workId, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              if (buyerId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: buyerId,
                  actor_id: null,
                  type: "artwork_purchased",
                  target_type: "profile_section",
                  target_id: workId,
                  message: "Purchase confirmed. The artist will be in touch about delivery.",
                  metadata: { work_id: workId, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              return new Response("ok");
            }
            if (isDues) {
              const { data: dueRows } = await supabaseAdmin
                .from("organization_dues_payments")
                .update({ status: "paid", stripe_payment_intent_id: paymentIntentId })
                .eq("stripe_checkout_session_id", session.id)
                .select("id, member_id, owner_id, org_id, amount_cents");
              for (const row of dueRows ?? []) {
                if (row.member_id) {
                  await supabaseAdmin.from("notifications").insert({
                    user_id: row.member_id,
                    actor_id: null,
                    type: "dues_paid",
                    target_type: "organization",
                    target_id: row.org_id,
                    message: "Your dues payment is confirmed. Thank you!",
                    metadata: { org_id: row.org_id, dues_payment_id: row.id },
                  });
                }
                if (row.owner_id && row.owner_id !== row.member_id) {
                  await supabaseAdmin.from("notifications").insert({
                    user_id: row.owner_id,
                    actor_id: row.member_id ?? null,
                    type: "dues_received",
                    target_type: "organization",
                    target_id: row.org_id,
                    message: "A member just paid their dues.",
                    metadata: { org_id: row.org_id, dues_payment_id: row.id },
                  });
                }
              }
              return new Response("ok");
            }
            const { data: updated } = await supabaseAdmin
              .from("tickets")
              .update({
                status: "paid",
                stripe_payment_intent_id: paymentIntentId,
              })
              .eq("stripe_checkout_session_id", session.id)
              .select("id, buyer_id, artist_id, event_id");
            for (const row of updated ?? []) {
              // Notify buyer
              if (row.buyer_id) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: row.buyer_id,
                  actor_id: null,
                  type: "ticket_purchased",
                  target_type: "ticket",
                  target_id: row.id,
                  message: "Your ticket is confirmed. Tap to view your digital ticket.",
                  metadata: { event_id: row.event_id, ticket_id: row.id },
                });
              }
              // Notify organizer
              if (row.artist_id && row.artist_id !== row.buyer_id) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: row.artist_id,
                  actor_id: row.buyer_id ?? null,
                  type: "ticket_sold",
                  target_type: "event",
                  target_id: row.event_id,
                  message: "You sold a ticket.",
                  metadata: { event_id: row.event_id, ticket_id: row.id },
                });
              }
            }
          } else if (event.type === "invoice.paid") {
            // Renewal of a recurring donation.
            const invoice = event.data.object as import("stripe").Stripe.Invoice;
            const meta = (invoice as unknown as {
              subscription_details?: { metadata?: Record<string, string> | null };
            }).subscription_details?.metadata ?? null;
            if (meta?.kind === "donation" && invoice.billing_reason === "subscription_cycle") {
              const amount = (invoice.amount_paid ?? 0) / 100;
              if (meta.owner_id) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: meta.owner_id,
                  actor_id: meta.donor_id ?? null,
                  type: "donation_received",
                  target_type: "organization",
                  target_id: meta.org_id ?? null,
                  message: `A recurring donation of $${amount.toFixed(2)} just renewed.`,
                  metadata: { org_id: meta.org_id, amount_cents: invoice.amount_paid ?? 0 },
                });
              }
            }
          } else if (event.type === "checkout.session.expired") {
            const session = event.data.object as import("stripe").Stripe.Checkout.Session;
            if (session.metadata?.kind === "dues") {
              await supabaseAdmin
                .from("organization_dues_payments")
                .update({ status: "failed" })
                .eq("stripe_checkout_session_id", session.id);
              return new Response("ok");
            }
            await supabaseAdmin
              .from("tickets")
              .update({ status: "failed" })
              .eq("stripe_checkout_session_id", session.id);
          } else if (event.type === "account.updated") {
            const acct = event.data.object as import("stripe").Stripe.Account;
            const chargesEnabled = !!acct.charges_enabled;
            await supabaseAdmin
              .from("profiles")
              .update({
                stripe_charges_enabled: chargesEnabled,
                stripe_account_status: chargesEnabled
                  ? "active"
                  : acct.details_submitted
                    ? "pending_review"
                    : "incomplete",
              })
              .eq("stripe_account_id", acct.id);
          }
        } catch (err) {
          console.error("Stripe webhook handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});