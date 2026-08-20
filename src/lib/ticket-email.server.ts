import { sendInternalEmail } from '@/lib/email-internal.server'

const SITE = 'https://www.planetbaltimore.com'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/**
 * Emails a buyer their ticket confirmation for one event purchase/RSVP.
 * Safe to call more than once: the idempotency key dedupes queued sends.
 */
export async function sendTicketConfirmation(args: {
  buyerId: string
  eventId: string
  ticketIds: string[]
  idempotencyKey: string
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name, username')
    .eq('id', args.buyerId)
    .maybeSingle()
  if (!buyer?.email) return { sent: false, reason: 'no_buyer_email' }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, starts_at, venue_name, address, location, image_url')
    .eq('id', args.eventId)
    .maybeSingle()
  if (!event) return { sent: false, reason: 'no_event' }

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('id, buyer_total_cents')
    .in('id', args.ticketIds)

  const rows = tickets ?? []
  const totalCents = rows.reduce((sum, t) => sum + (t.buyer_total_cents ?? 0), 0)
  const quantity = rows.length || args.ticketIds.length || 1

  const locationParts = [event.venue_name, event.address || event.location].filter(Boolean)

  return sendInternalEmail({
    templateName: 'ticket-confirmation',
    recipientEmail: buyer.email,
    idempotencyKey: args.idempotencyKey,
    templateData: {
      buyerName: buyer.display_name || buyer.username || 'there',
      eventTitle: event.title,
      eventDate: formatDate(event.starts_at),
      eventLocation: locationParts.join(', '),
      imageUrl: event.image_url || '',
      quantity,
      totalPaid: totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : '',
      ticketUrl: `${SITE}/t/${args.ticketIds[0] ?? ''}`,
      ticketCodes: args.ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
    },
  })
}

/**
 * Emails a buyer confirmation that their RSVP was cancelled.
 */
export async function sendTicketCancellation(args: {
  buyerId: string
  eventId: string
  ticketIds: string[]
  idempotencyKey: string
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name, username')
    .eq('id', args.buyerId)
    .maybeSingle()
  if (!buyer?.email) return { sent: false, reason: 'no_buyer_email' }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, starts_at, venue_name, address, location, image_url')
    .eq('id', args.eventId)
    .maybeSingle()
  if (!event) return { sent: false, reason: 'no_event' }

  const locationParts = [event.venue_name, event.address || event.location].filter(Boolean)

  return sendInternalEmail({
    templateName: 'ticket-cancelled',
    recipientEmail: buyer.email,
    idempotencyKey: args.idempotencyKey,
    templateData: {
      buyerName: buyer.display_name || buyer.username || 'there',
      eventTitle: event.title,
      eventDate: formatDate(event.starts_at),
      eventLocation: locationParts.join(', '),
      imageUrl: event.image_url || '',
      quantity: args.ticketIds.length || 1,
      eventUrl: `${SITE}/events/${args.eventId}`,
      ticketCodes: args.ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
    },
  })
}
