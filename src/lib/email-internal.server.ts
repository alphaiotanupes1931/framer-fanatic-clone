import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Planet Baltimore'
const SENDER_DOMAIN = 'notify.reeddigitalgroup.com'
const FROM_DOMAIN = 'reeddigitalgroup.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Server-only app email sender for system triggers that have no user JWT
 * (Stripe webhooks, background jobs). Mirrors the queue behaviour of the
 * standard send route: suppression check, unsubscribe token, enqueue.
 */
export async function sendInternalEmail(args: {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}): Promise<{ sent: boolean; reason?: string }> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const template = TEMPLATES[args.templateName]
  if (!template) return { sent: false, reason: 'template_not_found' }

  const recipient = template.to || args.recipientEmail
  if (!recipient) return { sent: false, reason: 'no_recipient' }
  const normalized = recipient.toLowerCase()

  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from('suppressed_emails')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()
  if (suppressionError) return { sent: false, reason: 'suppression_check_failed' }
  if (suppressed) return { sent: false, reason: 'email_suppressed' }

  let unsubscribeToken: string
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalized)
    .maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    const fresh = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert({ token: fresh, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalized)
      .maybeSingle()
    if (!stored) return { sent: false, reason: 'token_failed' }
    unsubscribeToken = stored.token
  } else {
    return { sent: false, reason: 'email_suppressed' }
  }

  const messageId = crypto.randomUUID()
  const data = args.templateData ?? {}
  const element = React.createElement(template.component, data)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject

  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: args.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqueueError } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: args.templateName,
      idempotency_key: args.idempotencyKey || messageId,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })
  if (enqueueError) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: args.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { sent: false, reason: 'enqueue_failed' }
  }
  return { sent: true }
}
