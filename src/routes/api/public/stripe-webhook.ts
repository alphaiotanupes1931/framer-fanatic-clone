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
        const { logStripeEvent, logStripeError } = await import("@/lib/stripe-log.server");
        try {
          if (!whSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
          // Workers/edge runtime uses SubtleCrypto: signature verification must be async.
          event = await stripe.webhooks.constructEventAsync(body, sig, whSecret);
        } catch (err) {
          console.error("Stripe webhook signature verification failed", err);
          await logStripeError("webhook", "signature.verification_failed", err, {
            has_secret: !!whSecret,
            has_signature: !!sig,
          });
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const ack = async (note?: string): Promise<Response> => {
          await logStripeEvent({
            source: "webhook",
            eventType: event.type,
            eventId: event.id,
            status: "ok",
            message: note ?? null,
            details: { livemode: event.livemode, created: event.created },
          });
          // Stripe only needs a 2xx; anything else makes it retry the event.
          return new Response("ok", { status: 200 });
        };

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
              return ack();
            }
            if (session.metadata?.kind === "product") {
              const sellerId = session.metadata?.seller_id ?? null;
              const buyerId = session.metadata?.buyer_id ?? null;
              const productId = session.metadata?.product_id ?? null;
              const orgId = session.metadata?.org_id ?? null;
              const quantity = Number(session.metadata?.quantity ?? "1") || 1;
              const amountCents = Number(session.metadata?.amount_cents ?? "0") || 0;
              await supabaseAdmin
                .from("product_orders")
                .update({ status: "paid", stripe_payment_intent_id: paymentIntentId })
                .eq("stripe_checkout_session_id", session.id);
              if (productId) {
                const { data: prod } = await supabaseAdmin
                  .from("organization_products")
                  .select("inventory")
                  .eq("id", productId)
                  .maybeSingle();
                if (prod && prod.inventory != null) {
                  const left = Math.max(0, prod.inventory - quantity);
                  await supabaseAdmin
                    .from("organization_products")
                    .update({ inventory: left, is_active: left > 0 })
                    .eq("id", productId);
                }
              }
              if (sellerId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: sellerId,
                  actor_id: buyerId,
                  type: "product_sold",
                  target_type: "organization",
                  target_id: orgId,
                  message: `You sold a product for $${(amountCents / 100).toFixed(2)}.`,
                  metadata: { product_id: productId, quantity, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              if (buyerId) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: buyerId,
                  actor_id: null,
                  type: "product_purchased",
                  target_type: "organization",
                  target_id: orgId,
                  message: "Purchase confirmed. The seller will be in touch about delivery.",
                  metadata: { product_id: productId, quantity, amount_cents: amountCents, payment_intent: paymentIntentId },
                });
              }
              return ack();
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
              return ack();
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
              return ack();
            }
            const { data: updated } = await supabaseAdmin
              .from("tickets")
              .update({
                status: "paid",
                stripe_payment_intent_id: paymentIntentId,
              })
              .eq("stripe_checkout_session_id", session.id)
              .select("id, buyer_id, artist_id, event_id");
            // One purchase can cover several seats. Send a single summary
            // notification each way instead of one per ticket.
            const rowsPaid = updated ?? [];
            const first = rowsPaid[0];
            const seats = rowsPaid.length;
            if (first) {
              if (first.buyer_id) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: first.buyer_id,
                  actor_id: null,
                  type: "ticket_purchased",
                  target_type: "ticket",
                  target_id: first.id,
                  message: seats > 1
                    ? `Your ${seats} tickets are confirmed. Each has its own QR code.`
                    : "Your ticket is confirmed. Tap to view your digital ticket.",
                  metadata: { event_id: first.event_id, ticket_id: first.id, quantity: seats },
                });
                try {
                  const { sendTicketConfirmation } = await import("@/lib/ticket-email.server");
                  await sendTicketConfirmation({
                    buyerId: first.buyer_id,
                    eventId: first.event_id,
                    ticketIds: rowsPaid.map((r) => r.id),
                    idempotencyKey: `ticket-confirm-${session.id}`,
                  });
                } catch (err) {
                  console.error("ticket confirmation email failed", err);
                }
              }
              if (first.artist_id && first.artist_id !== first.buyer_id) {
                await supabaseAdmin.from("notifications").insert({
                  user_id: first.artist_id,
                  actor_id: first.buyer_id ?? null,
                  type: "ticket_sold",
                  target_type: "event",
                  target_id: first.event_id,
                  message: seats > 1 ? `You sold ${seats} tickets.` : "You sold a ticket.",
                  metadata: { event_id: first.event_id, ticket_id: first.id, quantity: seats },
                });
              }
            }
          } else if (event.type === "charge.refunded") {
            // Full or partial refund issued from Stripe or the dashboard.
            const charge = event.data.object as import("stripe").Stripe.Charge;
            const pi = typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id ?? null;
            if (pi) {
              const { processTicketRefund } = await import("@/lib/ticket-refund.server");
              const res = await processTicketRefund({
                paymentIntentId: pi,
                refundedCents: charge.amount_refunded ?? undefined,
                eventKey: `${pi}-${charge.amount_refunded ?? 0}`,
              });
              return ack(res.handled ? `refunded ${res.ticketIds.length} ticket(s)` : "no matching tickets");
            }
          } else if (event.type === "refund.updated" || event.type === "charge.refund.updated") {
            const refund = event.data.object as import("stripe").Stripe.Refund;
            const pi = typeof refund.payment_intent === "string"
              ? refund.payment_intent
              : refund.payment_intent?.id ?? null;
            if (pi && refund.status === "succeeded") {
              const { processTicketRefund } = await import("@/lib/ticket-refund.server");
              const res = await processTicketRefund({
                paymentIntentId: pi,
                refundedCents: refund.amount ?? undefined,
                eventKey: refund.id,
              });
              return ack(res.handled ? `refunded ${res.ticketIds.length} ticket(s)` : "no matching tickets");
            }
          } else if (event.type === "charge.dispute.closed") {
            const dispute = event.data.object as import("stripe").Stripe.Dispute;
            const pi = typeof dispute.payment_intent === "string"
              ? dispute.payment_intent
              : dispute.payment_intent?.id ?? null;
            if (pi && dispute.status === "lost") {
              const { processTicketRefund } = await import("@/lib/ticket-refund.server");
              const res = await processTicketRefund({
                paymentIntentId: pi,
                refundedCents: dispute.amount ?? undefined,
                eventKey: dispute.id,
              });
              return ack(res.handled ? `chargeback voided ${res.ticketIds.length} ticket(s)` : "no matching tickets");
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
              return ack();
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
          await logStripeError("webhook", event.type, err, { event_id: event.id, stage: "handler" });
          return new Response("Handler error", { status: 500 });
        }

        return ack();
      },
    },
  },
});