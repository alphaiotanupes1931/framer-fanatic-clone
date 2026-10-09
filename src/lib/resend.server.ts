// Server-only: delivers mail through the connected Resend account.
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
export const RESEND_FROM = 'Planet Baltimore <noreply@mail.planetbaltimore.com>'

export class ResendError extends Error {
  status: number
  retryAfterSeconds: number | null
  constructor(status: number, body: string, retryAfter: number | null) {
    super(`Resend error ${status}: ${body}`)
    this.status = status
    this.retryAfterSeconds = retryAfter
  }
}

export async function sendViaResend(msg: {
  to: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  idempotencyKey?: string
}): Promise<{ id?: string }> {
  const lovableKey = process.env['LOVABLE_API_KEY']
  const resendKey = process.env['RESEND_API_KEY']
  if (!lovableKey || !resendKey) throw new Error('Email delivery is not configured')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${lovableKey}`,
    'X-Connection-Api-Key': resendKey,
  }
  if (msg.idempotencyKey) headers['Idempotency-Key'] = msg.idempotencyKey.slice(0, 256)
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    const ra = Number(res.headers.get('retry-after'))
    throw new ResendError(res.status, body, Number.isFinite(ra) && ra > 0 ? ra : null)
  }
  return (await res.json().catch(() => ({}))) as { id?: string }
}
