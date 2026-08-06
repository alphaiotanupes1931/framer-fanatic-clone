// Server-only helper: records Stripe webhook + API activity so admins can see
// Connect / platform-profile errors directly in the app.

export type StripeLogEntry = {
  source: "webhook" | "api";
  eventType: string;
  eventId?: string | null;
  status: "ok" | "error";
  message?: string | null;
  details?: unknown;
};

function safeDetails(details: unknown) {
  if (details == null) return null;
  try {
    return JSON.parse(JSON.stringify(details, (_k, v) => (typeof v === "bigint" ? String(v) : v)));
  } catch {
    return { note: String(details) };
  }
}

export function describeStripeError(error: unknown): { message: string; details: Record<string, unknown> } {
  const e = error as { message?: string; type?: string; code?: string; statusCode?: number; requestId?: string; raw?: { message?: string; doc_url?: string } } | null;
  return {
    message: e?.raw?.message || e?.message || "Unknown payment error",
    details: {
      type: e?.type ?? null,
      code: e?.code ?? null,
      status_code: e?.statusCode ?? null,
      request_id: e?.requestId ?? null,
      doc_url: e?.raw?.doc_url ?? null,
    },
  };
}

/** Never throws: logging must not break a payment flow or a webhook ack. */
export async function logStripeEvent(entry: StripeLogEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("stripe_event_logs").insert({
      source: entry.source,
      event_type: entry.eventType,
      event_id: entry.eventId ?? null,
      status: entry.status,
      message: entry.message ? String(entry.message).slice(0, 2000) : null,
      details: safeDetails(entry.details),
    } as never);
  } catch (err) {
    console.error("stripe log write failed", err);
  }
}

export async function logStripeError(source: "webhook" | "api", eventType: string, error: unknown, extra?: Record<string, unknown>) {
  const { message, details } = describeStripeError(error);
  await logStripeEvent({
    source,
    eventType,
    status: "error",
    message,
    details: { ...details, ...(extra ?? {}) },
  });
}