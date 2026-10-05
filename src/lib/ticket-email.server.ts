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
  /** Stable key so every ticket in one order overwrites the same document. */
  storageKey?: string,
): Promise<string> {
  try {
    const { buildTicketPdf } = await import('@/lib/ticket-pdf.server')
    const bytes = await buildTicketPdf(input)
    const path = `${eventId}/${storageKey || input.tickets[0]?.id || crypto.randomUUID()}.pdf`
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
 * Expands a set of ticket ids to every ticket bought in the same order, so one
 * PDF carries all seats even when the caller only knows about some rows (for
 * example when the webhook and the client-side reconcile each update a subset).
 * Orders are grouped by Stripe checkout session, falling back to the payment
 * intent, then to the ids as given for free RSVPs.
 */
async function expandOrderTickets(
  admin: any,
  eventId: string,
  ticketIds: string[],
): Promise<{ ids: string[]; totalCents: number; storageKey: string }> {
  const fallback = { ids: ticketIds, totalCents: 0, storageKey: ticketIds[0] ?? '' }
  const { data: seed } = await admin
    .from('tickets')
    .select('id, buyer_id, buyer_total_cents, stripe_checkout_session_id, stripe_payment_intent_id, created_at')
    .in('id', ticketIds)
  const seedRows = (seed ?? []) as {
    id: string
    buyer_id: string | null
    buyer_total_cents: number | null
    stripe_checkout_session_id: string | null
    stripe_payment_intent_id: string | null
    created_at: string
  }[]
  if (!seedRows.length) return fallback

  const sessionId = seedRows.find((r) => r.stripe_checkout_session_id)?.stripe_checkout_session_id ?? null
  const intentId = seedRows.find((r) => r.stripe_payment_intent_id)?.stripe_payment_intent_id ?? null

  let orderRows = seedRows
  if (sessionId || intentId) {
    const query = admin
      .from('tickets')
      .select('id, buyer_total_cents, created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })
    const { data: all } = sessionId
      ? await query.eq('stripe_checkout_session_id', sessionId)
      : await query.eq('stripe_payment_intent_id', intentId!)
    if (all?.length) orderRows = all as typeof seedRows
  } else {
    orderRows = [...seedRows].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  const ids = Array.from(new Set([...orderRows.map((r) => r.id), ...ticketIds]))
  const byId = new Map(orderRows.map((r) => [r.id, r.buyer_total_cents ?? 0]))
  const totalCents = ids.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0)
  return { ids, totalCents, storageKey: sessionId || intentId || ids[0] || '' }
}

/**
 * Emails a buyer their ticket confirmation for one event purchase/RSVP.
 * Safe to call more than once: the idempotency key dedupes queued sends.
 */
export async function sendTicketConfirmation(args: {
  buyerId: string | null
  /** Overrides the account lookup, used for manually added (comp) guests. */
  recipient?: { email: string; name: string }
  eventId: string
  ticketIds: string[]
  /** Set for manually issued tickets; switches the subject line. */
  ticketName?: string
  idempotencyKey: string
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const buyer = args.recipient
    ? { email: args.recipient.email, display_name: args.recipient.name, username: null as string | null }
    : args.buyerId
      ? (await supabaseAdmin.from('profiles').select('email, display_name, username').eq('id', args.buyerId).maybeSingle()).data
      : null
  if (!buyer?.email) return { sent: false, reason: 'no_buyer_email' }

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('title, starts_at, venue_name, address, location, image_url')
    .eq('id', args.eventId)
    .maybeSingle()
  if (!event) return { sent: false, reason: 'no_event' }

  // One order can span several seats, and the caller may only know about some
  // of them, so pull in every ticket from the same Stripe order.
  const order = await expandOrderTickets(supabaseAdmin, args.eventId, args.ticketIds)
  const ticketIds = order.ids
  const totalCents = order.totalCents
  const quantity = ticketIds.length || 1

  const locationParts = [event.venue_name, event.address || event.location].filter(Boolean)
  const buyerName = buyer.display_name || buyer.username || 'there'
  const totalPaid = totalCents > 0 ? `$${(totalCents / 100).toFixed(2)}` : ''

  const pdfUrl = await buildAndStoreTicketPdf(supabaseAdmin, args.eventId, {
    eventTitle: event.title,
    eventDate: formatDate(event.starts_at),
    eventLocation: locationParts.join(', '),
    buyerName,
    totalPaid,
    tickets: ticketIds.map((id) => ({ id, url: `${SITE}/tickets/${id}?verify=1` })),
  }, order.storageKey)

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
      ticketUrl: `${SITE}/t/${ticketIds[0] ?? ''}`,
      pdfUrl,
      ticketCodes: ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
      ticketName: args.ticketName,
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
  // Void every seat from the order in the same document the buyer already has.
  const order = await expandOrderTickets(supabaseAdmin, args.eventId, args.ticketIds)
  const ticketIds = order.ids
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
    tickets: ticketIds.map((id) => ({ id, url: `${SITE}/tickets/${id}?verify=1` })),
    voidLabel: kind === 'refunded' ? 'REFUNDED' : 'CANCELLED',
    voidNote:
      kind === 'refunded'
        ? refundAmount
          ? `Refunded ${refundAmount}`
          : 'Refund issued'
        : 'This RSVP was cancelled',
  }, order.storageKey)

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
      quantity: ticketIds.length || 1,
      eventUrl: `${SITE}/events/${args.eventId}`,
      ticketCodes: ticketIds.map((id) => id.slice(0, 8).toUpperCase()),
      reason: kind,
      refundAmount,
      pdfUrl,
    },
  })
}

/**
 * Tells everyone holding an active ticket or RSVP that the organizer
 * cancelled the event. One email per address, with the organizer's note.
 */
export async function sendEventCancelledNotices(args: { eventId: string; note?: string }) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { sendInternalEmail } = await import('@/lib/email-internal.server')
  const { data: event } = await supabaseAdmin
    .from('events')
    .select('id, title, starts_at, venue_name, address, location, image_url')
    .eq('id', args.eventId)
    .maybeSingle()
  if (!event) return { sent: 0, total: 0 }
  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('buyer_id, guest_name, guest_email, status')
    .eq('event_id', args.eventId)
    .not('status', 'in', '(failed,refunded)')
  const buyerIds = [...new Set((tickets ?? []).map((t) => t.buyer_id).filter(Boolean) as string[])]
  const { data: profiles } = buyerIds.length
    ? await supabaseAdmin.from('profiles').select('id, email, display_name').in('id', buyerIds)
    : { data: [] as { id: string; email: string | null; display_name: string | null }[] }
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const recipients = new Map<string, string>()
  for (const t of tickets ?? []) {
    const p = t.buyer_id ? byId.get(t.buyer_id) : null
    const email = (p?.email || t.guest_email || '').toLowerCase().trim()
    if (email && !recipients.has(email)) recipients.set(email, p?.display_name || t.guest_name || 'there')
  }
  const imageUrl = await emailSafeImageUrl(event.image_url, supabaseAdmin as any)
  const location = [event.venue_name, event.address || event.location].filter(Boolean).join(', ')
  let sent = 0
  for (const [email, name] of recipients) {
    try {
      const r = await sendInternalEmail({
        templateName: 'event-cancelled',
        recipientEmail: email,
        idempotencyKey: `event-cancelled-${event.id}-${email}`,
        templateData: {
          name,
          eventTitle: event.title,
          eventDate: formatDate(event.starts_at),
          eventLocation: location,
          imageUrl,
          note: args.note || '',
          eventUrl: `https://www.planetbaltimore.com/events/${event.id}`,
        },
      })
      if (r.sent) sent++
    } catch (e) {
      console.error('event cancelled email failed', e)
    }
  }
  return { sent, total: recipients.size }
}
