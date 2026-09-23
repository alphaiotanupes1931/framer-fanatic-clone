import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

const SITE_URL = 'https://www.planetbaltimore.com'

type InquiryInput = {
  artistId: string
  intent: string
  senderName: string
  senderEmail: string
  message: string
  pageName?: string
  pageUrl?: string
  pageEmail?: string | null
}

/**
 * Saves a page inquiry and delivers it to the page owner: opens a real Planet
 * Baltimore message thread (when the sender is signed in) and emails the owner.
 * The row is written server-side so the sender never needs read access to
 * artist_inquiries (the table is readable only by the page owner).
 */
export const deliverArtistInquiry = createServerFn({ method: 'POST' })
  .inputValidator((data: InquiryInput) => {
    if (!data?.artistId) throw new Error('artistId is required')
    if (!data.senderName?.trim() || !data.senderEmail?.trim() || !data.message?.trim()) {
      throw new Error('Name, email and message are required')
    }
    return data
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendInternalEmail } = await import('@/lib/email-internal.server')

    // Identify the sender from the bearer token when one is attached.
    let senderId: string | null = null
    const authHeader = getRequest()?.headers?.get('authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length)
      if (token.split('.').length === 3) {
        const { data: userData } = await supabaseAdmin.auth.getUser(token)
        senderId = userData?.user?.id ?? null
      }
    }

    const intent = data.intent || 'General'
    const senderName = data.senderName.trim()
    const senderEmail = data.senderEmail.trim()
    const message = data.message.trim()

    const { data: inquiry, error: insertError } = await supabaseAdmin
      .from('artist_inquiries')
      .insert({
        artist_id: data.artistId,
        sender_id: senderId,
        intent,
        sender_name: senderName,
        sender_email: senderEmail,
        message,
      })
      .select('id')
      .single()
    if (insertError || !inquiry) throw new Error(insertError?.message || 'Could not save your message')

    const body = [
      `${intent} inquiry from ${senderName}`,
      senderEmail ? `Reply to: ${senderEmail}` : null,
      '',
      message,
    ]
      .filter((line) => line !== null)
      .join('\n')

    // Message thread: only possible when the sender has an account.
    let messaged = false
    if (senderId && senderId !== data.artistId) {
      const a = senderId
      const b = data.artistId
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

    // Email the artist: the page's public contact email plus the owner's account email.
    const { data: owner } = await supabaseAdmin
      .from('profiles')
      .select('email, display_name, username')
      .eq('id', data.artistId)
      .maybeSingle()
    const pageName = data.pageName || owner?.display_name || 'your page'
    const pageUrl = data.pageUrl || SITE_URL
    const isEmail = (e?: string | null) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
    const recipients = Array.from(
      new Set(
        [data.pageEmail, owner?.email]
          .filter(isEmail)
          .map((e) => (e as string).trim().toLowerCase()),
      ),
    )
    let emailed = false
    for (const [i, recipientEmail] of recipients.entries()) {
      try {
        const result = await sendInternalEmail({
          templateName: 'artist-inquiry',
          recipientEmail,
          idempotencyKey: `inquiry-${inquiry.id}-${i}`,
          templateData: { intent, senderName, senderEmail, message, pageName, pageUrl },
        })
        emailed = emailed || result.sent
      } catch (e) {
        console.error('[inquiry] artist email failed', e)
      }
    }

    // Confirmation copy to the person who sent the inquiry.
    let confirmed = false
    if (isEmail(senderEmail)) {
      try {
        const result = await sendInternalEmail({
          templateName: 'inquiry-confirmation',
          recipientEmail: senderEmail,
          idempotencyKey: `inquiry-confirm-${inquiry.id}`,
          templateData: { intent, senderName, message, pageName, pageUrl },
        })
        confirmed = result.sent
      } catch (e) {
        console.error('[inquiry] confirmation email failed', e)
      }
    }

    return { delivered: messaged || emailed, messaged, emailed, confirmed }
  })
