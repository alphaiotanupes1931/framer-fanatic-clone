import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the signed-in buyer a confirmation for their free RSVP tickets.
 * Paid purchases are emailed from the Stripe webhook instead.
 */
export const emailMyTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => {
    if (!input?.eventId) throw new Error("eventId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("event_id", data.eventId)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: true });
    const ids = (tickets ?? []).map((t) => t.id);
    if (!ids.length) return { sent: false };

    const { sendTicketConfirmation } = await import("@/lib/ticket-email.server");
    return sendTicketConfirmation({
      buyerId: userId,
      eventId: data.eventId,
      ticketIds: ids,
      idempotencyKey: `ticket-confirm-free-${data.eventId}-${userId}-${ids.length}`,
    });
  });
