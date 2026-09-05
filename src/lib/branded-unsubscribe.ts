/**
 * Branded unsubscribe footer.
 *
 * The managed email provider appends its own unsubscribe footer whenever an
 * `unsubscribe_token` is included in the send payload, and that link points at
 * a third-party domain. We therefore omit the token from the provider payload
 * and append our own footer that points at the Planet Baltimore unsubscribe
 * page instead.
 */

export const SITE_URL = 'https://www.planetbaltimore.com'

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`
}

function footerHtml(token: string): string {
  const url = unsubscribeUrl(token)
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e5e5e5;">
  <tr>
    <td style="padding:20px 24px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#767676;">
      You are receiving this email from Planet Baltimore.<br />
      <a href="${url}" style="color:#767676;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${SITE_URL}" style="color:#767676;text-decoration:underline;">planetbaltimore.com</a>
    </td>
  </tr>
</table>`
}

/** Append the branded footer to a rendered HTML email. */
export function withBrandedUnsubscribeHtml(html: string, token: string): string {
  const footer = footerHtml(token)
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`)
  }
  return `${html}${footer}`
}

/** Append the branded footer to the plain-text version of an email. */
export function withBrandedUnsubscribeText(text: string, token: string): string {
  return `${text}\n\n---\nYou are receiving this email from Planet Baltimore.\nUnsubscribe: ${unsubscribeUrl(token)}\n`
}
