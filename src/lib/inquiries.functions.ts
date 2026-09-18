import { createServerFn } from '@tanstack/react-start'

const SITE_URL = 'https://www.planetbaltimore.com'

/**
 * Delivers a page inquiry that was just stored in artist_inquiries: opens a
 * real Planet Baltimore message thread with the page owner (when the sender is
 * signed in) and emails the owner. Only fresh rows are delivered, so the
 * endpoint cannot be replayed to spam an owner.
 */
export const deliverArtistInquiry = createServerFn({ method: 'POST' })
  .inputValidator((data: { inquiryId: string; pageName?: string; pageUrl?: string }) => {
    if (!data?.inquiryId || typeof data.inquiryId !== 'string') throw new Error('inquiryId is required')
    return data
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendInternalEmail } = await import('@/lib/email-internal.server')

    const { data: inquiry } = await supabaseAdmin
      .from('artist_inquiries')
      .select('id, artist_id, sender_id, intent, sender_name, sender_email, message, created_at')
      .eq('id', data.inquiryId)
      .maybeSingle()
    if (!inquiry) return { delivered: false, reason: 'not_found' as const }

    const ageMs = Date.now() - new Date(inquiry.created_at).getTime()
    if (ageMs > 10 * 60 * 1000) return { delivered: false, reason: 'expired' as const }

    const intent = inquiry.intent || 'General'
    const senderName = inquiry.sender_name || 'Someone'
    const body = [
      `${intent} inquiry from ${senderName}`,
      inquiry.sender_email ? `Reply to: ${inquiry.sender_email}` : null,
      '',
      inquiry.message,
    ]
      .filter((line) => line !== null)
      .join('\n')

    // Message thread: only possible when the sender has an account.
    let messaged = false
    if (inquiry.sender_id && inquiry.sender_id !== inquiry.artist_id) {
      const a = inquiry.sender_id
      const b = inquiry.artist_id
      const { data: existing } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`and(user_a.eq.${a},user_b.eq.${b}),and(user_a.eq.${b},user_b.eq.${a})`)
        .limit(1)
        .maybeSingle()
      let conversationId = existing?.id as string | undefined
      if (!conversationId) {
        const { data: created } = await supabaseAdmin
          .from('conversations')
          .insert({ user_a: a, user_b: b, created_by: a })
          .select('id')
          .single()
        conversationId = created?.id
      }
      if (conversationId) {
        const { error } = await supabaseAdmin
          .from('messages')
          .insert({ conversation_id: conversationId, sender_id: a, content: body })
        messaged = !error
      }
    }

    // Email the page owner.
    let emailed = false
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name, username')
      .eq('id', inquiry.artist_id)
      .maybeSingle()
    if (owner?.email) {
      const result = await sendInternalEmail({
        templateName: 'artist-inquiry',
        recipientEmail: owner.email,
        idempotencyKey: `inquiry-${inquiry.id}`,
        templateData: {
          intent,
          senderName,
          senderEmail: inquiry.sender_email ?? '',
          message: inquiry.message ?? '',
          pageName: data.pageName || owner.display_name || 'your page',
          pageUrl: data.pageUrl || SITE_URL,
        },
      })
      emailed = result.sent
    }

    return { delivered: messaged || emailed, messaged, emailed }
  })
