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
      .neq("status", "cancelled")
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

/**
 * Emails the signed-in buyer a confirmation that their RSVP was cancelled.
 */
export const emailMyCancellation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string }) => {
    if (!input?.ticketId) throw new Error("ticketId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, event_id, buyer_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!ticket || ticket.buyer_id !== userId || !ticket.event_id) return { sent: false };

    const { sendTicketCancellation } = await import("@/lib/ticket-email.server");
    return sendTicketCancellation({
      buyerId: userId,
      eventId: ticket.event_id,
      ticketIds: [ticket.id],
      idempotencyKey: `ticket-cancel-${ticket.id}`,
    });
  });
