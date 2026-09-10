/**
 * Branded unsubscribe footer.
 *
 * The managed email provider appends its own unsubscribe footer whenever an
 * `unsubscribe_token` is included in the send payload, and that link points at
 * a third-party domain. We therefore omit the token from the provider payload
 * and append our own footer that points at the Planet Baltimore unsubscribe
 * page instead.
 *
 * We also inject a small style block that tones down the provider's default
 * footer (the one that appears below our branded footer) so the Planet
 * Baltimore unsubscribe link remains the one recipients notice.
 */

export const SITE_URL = 'https://www.planetbaltimore.com'

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`
}

function footerHtml(token: string): string {
  const url = unsubscribeUrl(token)
  return `
<table class="pb-branded-footer" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e5e5e5;">
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

function providerFooterMinimizeStyle(): string {
  return `<style type="text/css">
  /* Collapse the provider's default footer that is appended below our branded
     footer, so the Planet Baltimore unsubscribe link is the only one shown.
     Selectors avoid a "body >" prefix because clients such as Gmail rewrite
     the body element into a div. */
  .pb-branded-footer ~ table,
  .pb-branded-footer ~ div,
  .pb-branded-footer ~ p,
  .pb-branded-footer ~ a,
  .pb-branded-footer ~ center,
  .pb-branded-footer ~ span {
    display: none !important;
    max-height: 0 !important;
    overflow: hidden !important;
    font-size: 0 !important;
    line-height: 0 !important;
    color: #ffffff !important;
    background-color: #ffffff !important;
    mso-hide: all !important;
  }
  .pb-branded-footer ~ table a,
  .pb-branded-footer ~ div a,
  .pb-branded-footer ~ table td,
  .pb-branded-footer ~ div td {
    display: none !important;
    font-size: 0 !important;
    line-height: 0 !important;
    color: #ffffff !important;
    text-decoration: none !important;
    background-color: #ffffff !important;
    mso-hide: all !important;
  }
</style>`
}


/** Append the branded footer to a rendered HTML email. */
export function withBrandedUnsubscribeHtml(html: string, token: string): string {
  const footer = footerHtml(token)
  const style = providerFooterMinimizeStyle()
  let result = html
  if (result.includes('</head>')) {
    result = result.replace('</head>', `${style}</head>`)
  }
  if (result.includes('</body>')) {
    return result.replace('</body>', `${footer}</body>`)
  }
  return `${style}${result}${footer}`
}

/** Append the branded footer to the plain-text version of an email. */
export function withBrandedUnsubscribeText(text: string, token: string): string {
  return `${text}\n\n---\nYou are receiving this email from Planet Baltimore.\nUnsubscribe: ${unsubscribeUrl(token)}\n`
}
