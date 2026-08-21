import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/check-stripe-webhooks")({
  server: {
    handlers: {
      GET: async () => {
        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();
        const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
        return Response.json({
          count: endpoints.data.length,
          endpoints: endpoints.data.map((e) => ({
            id: e.id,
            url: e.url,
            status: e.status,
            enabled_events: e.enabled_events,
            secret_redacted: e.secret ? "***" + e.secret.slice(-6) : null,
            livemode: e.livemode,
            created: e.created,
          })),
        });
      },
    },
  },
});
