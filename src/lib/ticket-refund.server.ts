/**
 * Shared refund/cancellation pipeline for tickets.
 *
 * Marks the affected tickets refunded, notifies the buyer and the seller,
 * re-renders the stored PDF with a void stamp, and sends the follow-up email.
 * Safe to call more than once for the same payment: already-refunded tickets
 * are skipped and the email idempotency key dedupes queued sends.
 */
export async function processTicketRefund(args: {
  paymentIntentId: string
  /** Total amount refunded on the payment, in cents (Stripe's `amount_refunded`). */
  refundedCents?: number
  /** Optional stable suffix for the email idempotency key. */
  eventKey?: string
}): Promise<{ handled: boolean; ticketIds: string[] }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { data: existing } = await supabaseAdmin
    .from('tickets')
    .select('id, buyer_id, artist_id, event_id, status, buyer_total_cents')
    .eq('stripe_payment_intent_id', args.paymentIntentId)

  const rows = (existing ?? []).filter((t) => t.status !== 'refunded')
  if (!rows.length) return { handled: false, ticketIds: [] }

  const ids = rows.map((r) => r.id)
  const totalCents = rows.reduce((sum, t) => sum + (t.buyer_total_cents ?? 0), 0)
  const refundedCents = args.refundedCents ?? totalCents

  await supabaseAdmin
    .from('tickets')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refunded_cents: refundedCents,
    })
    .in('id', ids)

  const first = rows[0]!
  const seats = rows.length
  const amount = refundedCents > 0 ? `$${(refundedCents / 100).toFixed(2)}` : ''

  if (first.buyer_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: first.buyer_id,
      actor_id: null,
      type: 'ticket_refunded',
      target_type: 'ticket',
      target_id: first.id,
      message: amount
        ? `Your ${seats > 1 ? `${seats} tickets were` : 'ticket was'} refunded (${amount}).`
        : `Your ${seats > 1 ? `${seats} tickets were` : 'ticket was'} refunded.`,
      metadata: { event_id: first.event_id, ticket_id: first.id, quantity: seats, refunded_cents: refundedCents },
    })
  }

  if (first.artist_id && first.artist_id !== first.buyer_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: first.artist_id,
      actor_id: first.buyer_id ?? null,
      type: 'ticket_refund_issued',
      target_type: 'event',
      target_id: first.event_id,
      message: seats > 1 ? `${seats} tickets were refunded.` : 'A ticket was refunded.',
      metadata: { event_id: first.event_id, ticket_id: first.id, quantity: seats, refunded_cents: refundedCents },
    })
  }

  if (first.buyer_id && first.event_id) {
    try {
      const { sendTicketCancellation } = await import('@/lib/ticket-email.server')
      await sendTicketCancellation({
        buyerId: first.buyer_id,
        eventId: first.event_id,
        ticketIds: ids,
        idempotencyKey: `ticket-refund-${args.eventKey ?? args.paymentIntentId}`,
        reason: 'refunded',
        refundedCents,
      })
    } catch (err) {
      console.error('ticket refund email failed', err)
    }
  }

  return { handled: true, ticketIds: ids }
}
