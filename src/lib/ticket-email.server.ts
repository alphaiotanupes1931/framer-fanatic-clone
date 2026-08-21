import { sendInternalEmail } from '@/lib/email-internal.server'

const SITE = 'https://www.planetbaltimore.com'

/**
 * Email clients cannot use our private storage buckets, so turn whatever the
 * event stores (bare path, public URL, or stale signed URL) into a long-lived
 * signed URL that renders in any inbox.
 */
async function emailSafeImageUrl(
  raw: string | null | undefined,
  admin: { storage: { from: (b: string) => { createSignedUrl: (p: string, e: number) => Promise<{ data: { signedUrl: string } | null }> } } },
): Promise<string> {
  if (!raw) return ''
  let bucket = 'event-images'
  let path = raw
  const m = raw.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/)
  if (m) {
    bucket = m[1]!
    path = decodeURIComponent(m[2]!)
  } else if (/^https?:\/\//i.test(raw)) {
    return raw
  }
  try {
    const { data } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365)
    return data?.signedUrl || ''
  } catch {
    return ''
  }
}

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
 * Renders the dark-stub PDF ticket, stores it, and returns a long-lived signed
 * link. Email delivery cannot carry file attachments, so the confirmation email
 * links to this PDF instead. Failures are non-fatal: the email still sends.
 */
async function buildAndStoreTicketPdf(
  admin: any,
  eventId: string,
  input: import('@/lib/ticket-pdf.server').TicketPdfInput,
): Promise<string> {
  try {
    const { buildTicketPdf } = await import('@/lib/ticket-pdf.server')
    const bytes = await buildTicketPdf(input)
    const path = `${eventId}/${input.tickets[0]?.id ?? crypto.randomUUID()}.pdf`
    const { error } = await admin.storage
      .from('ticket-pdfs')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true })
    if (error) throw error
    const { data } = await admin.storage
      .from('ticket-pdfs')
      .createSignedUrl(path, 60 * 60 * 24 * 365)
    return data?.signedUrl || ''
  } catch (err) {
    console.error('ticket pdf generation failed', err)
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
  const buyerName = buyer.display_name || buyer.username || 'there'
  const totalPaid = totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : ''

  const pdfUrl = await buildAndStoreTicketPdf(supabaseAdmin, args.eventId, {
    eventTitle: event.title,
    eventDate: formatDate(event.starts_at),
    eventLocation: locationParts.join(', '),
    buyerName,
    totalPaid,
    tickets: args.ticketIds.map((id) => ({ id, url: `${SITE}/tickets/${id}?verify=1` })),
  })

  return sendInternalEmail({
    templateName: 'ticket-confirmation',
    recipientEmail: buyer.email,
    idempotencyKey: args.idempotencyKey,
    templateData: {
      buyerName,
      eventTitle: event.title,
      eventDate: formatDate(event.starts_at),
      eventLocation: locationParts.join(', '),
      imageUrl: await emailSafeImageUrl(event.image_url, supabaseAdmin as any),
      quantity,
      totalPaid,
      ticketUrl: `${SITE}/t/${args.ticketIds[0] ?? ''}`,
      pdfUrl,
      ticketCodes: args.ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
    },
  })
}

/**
 * Emails a buyer that their tickets were cancelled or refunded, and re-renders
 * the stored PDF with a void stamp so any previously shared download link
 * immediately reflects the new status.
 */
export async function sendTicketCancellation(args: {
  buyerId: string
  eventId: string
  ticketIds: string[]
  idempotencyKey: string
  /** "cancelled" (RSVP released) or "refunded" (money returned). */
  reason?: 'cancelled' | 'refunded'
  refundedCents?: number
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const kind = args.reason ?? 'cancelled'

  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('email, display_name, username')
    .eq('id', args.buyerId)
    .maybeSingle()

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, starts_at, venue_name, address, location, image_url')
    .eq('id', args.eventId)
    .maybeSingle()
  if (!event) return { sent: false, reason: 'no_event' }

  const locationParts = [event.venue_name, event.address || event.location].filter(Boolean)
  const buyerName = buyer?.display_name || buyer?.username || 'there'
  const refundAmount =
    typeof args.refundedCents === 'number' && args.refundedCents > 0
      ? `$${(args.refundedCents / 100).toFixed(2)}`
      : ''

  // Void the stored PDF first so the download link never shows a live QR.
  const pdfUrl = await buildAndStoreTicketPdf(supabaseAdmin, args.eventId, {
    eventTitle: event.title,
    eventDate: formatDate(event.starts_at),
    eventLocation: locationParts.join(', '),
    buyerName,
    totalPaid: refundAmount,
    tickets: args.ticketIds.map((id) => ({ id, url: `${SITE}/tickets/${id}?verify=1` })),
    voidLabel: kind === 'refunded' ? 'REFUNDED' : 'CANCELLED',
    voidNote:
      kind === 'refunded'
        ? refundAmount
          ? `Refunded ${refundAmount}`
          : 'Refund issued'
        : 'This RSVP was cancelled',
  })

  if (!buyer?.email) return { sent: false, reason: 'no_buyer_email' }

  return sendInternalEmail({
    templateName: 'ticket-cancelled',
    recipientEmail: buyer.email,
    idempotencyKey: args.idempotencyKey,
    templateData: {
      buyerName,
      eventTitle: event.title,
      eventDate: formatDate(event.starts_at),
      eventLocation: locationParts.join(', '),
      imageUrl: await emailSafeImageUrl(event.image_url, supabaseAdmin as any),
      quantity: args.ticketIds.length || 1,
      eventUrl: `${SITE}/events/${args.eventId}`,
      ticketCodes: args.ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
      reason: kind,
      refundAmount,
      pdfUrl,
    },
  })
}
