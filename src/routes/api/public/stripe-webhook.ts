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
            const { data: updated } = await supabaseAdmin
              .from("tickets")
              .update({
                status: "paid",
                stripe_payment_intent_id:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : session.payment_intent?.id ?? null,
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
          } else if (event.type === "checkout.session.expired") {
            const session = event.data.object as import("stripe").Stripe.Checkout.Session;
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