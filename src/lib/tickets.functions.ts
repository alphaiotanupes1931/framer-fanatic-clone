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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertHost(supabase: any, userId: string, eventId: string) {
  const { data: ev } = await supabase.from("events").select("id, user_id").eq("id", eventId).maybeSingle();
  if (!ev) throw new Error("Event not found");
  if (ev.user_id !== userId) {
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Only the event organizer can add attendees");
  }
  return ev as { id: string; user_id: string };
}

/**
 * Organizer adds an attendee by hand (cash at the door, special guest).
 * Creates a $0 comp ticket that counts toward attendance and check-in.
 */
export const addCompAttendee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; name: string; email: string; ticketTypeId?: string | null }) => {
    if (!input?.eventId) throw new Error("eventId is required");
    if (!input.name?.trim()) throw new Error("Name is required");
    if (!EMAIL_RE.test(input.email?.trim() ?? "")) throw new Error("Enter a valid email");
    return { eventId: input.eventId, name: input.name.trim().slice(0, 120), email: input.email.trim().toLowerCase().slice(0, 254), ticketTypeId: input.ticketTypeId || null };
  })
  .handler(async ({ data, context }) => {
    const ev = await assertHost(context.supabase, context.userId, data.eventId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Link to an existing account when the email matches one, so it shows in their tickets.
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").ilike("email", data.email).limit(1).maybeSingle();
    let typeName = "Comp";
    if (data.ticketTypeId) {
      const { data: tt } = await supabaseAdmin.from("ticket_types").select("id, name, event_id").eq("id", data.ticketTypeId).maybeSingle();
      if (!tt || tt.event_id !== data.eventId) throw new Error("Ticket type not found for this event");
      typeName = tt.name;
    }
    const { data: row, error } = await supabaseAdmin
      .from("tickets")
      .insert({
        event_id: data.eventId,
        buyer_id: prof?.id ?? null,
        artist_id: ev.user_id,
        buyer_total_cents: 0,
        artist_net_cents: 0,
        platform_tax_cents: 0,
        status: "paid",
        is_comp: true,
        guest_name: data.name,
        guest_email: data.email,
        ticket_type_id: data.ticketTypeId,
        ticket_type_name: typeName,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message || "Could not add attendee");
    return { id: row.id as string };
  });

/** Emails a comp ticket (with QR/PDF link) to the manually added attendee. */
export const sendCompTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string }) => {
    if (!input?.ticketId) throw new Error("ticketId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin
      .from("tickets")
      .select("id, event_id, buyer_id, guest_name, guest_email, is_comp, ticket_type_name")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (!t || !t.guest_email) throw new Error("Ticket not found");
    await assertHost(context.supabase, context.userId, t.event_id);
    const { sendTicketConfirmation } = await import("@/lib/ticket-email.server");
    const res = await sendTicketConfirmation({
      buyerId: t.buyer_id,
      recipient: { email: t.guest_email, name: t.guest_name || "Guest" },
      eventId: t.event_id,
      ticketIds: [t.id],
      ticketName: t.ticket_type_name || "Comp",
      idempotencyKey: `comp-ticket-${t.id}-${Date.now()}`,
    });
    if (!res.sent) throw new Error("Could not send the ticket email");
    await supabaseAdmin.from("tickets").update({ ticket_sent_at: new Date().toISOString() }).eq("id", t.id);
    return { sent: true };
  });

/**
 * Organizer cancels an event: marks it cancelled and emails everyone who
 * RSVPed or holds a ticket, with an optional note.
 */
export const cancelEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; note?: string }) => {
    if (!input?.eventId) throw new Error("eventId is required");
    return { eventId: input.eventId, note: (input.note ?? "").trim().slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    await assertHost(context.supabase, context.userId, data.eventId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("events").update({ status: "cancelled" }).eq("id", data.eventId);
    if (error) throw new Error("Could not cancel the event");
    const { sendEventCancelledNotices } = await import("@/lib/ticket-email.server");
    return sendEventCancelledNotices({ eventId: data.eventId, note: data.note });
  });
