export type RichEmailInline = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  href?: string
}

export type RichEmailBlock = {
  type: 'paragraph' | 'heading' | 'subheading' | 'blockquote' | 'unordered-list' | 'ordered-list'
  children?: RichEmailInline[]
  items?: RichEmailInline[][]
}

export type RichEmailDocument = RichEmailBlock[]

type InlineMarks = Omit<RichEmailInline, 'text'>

function collectInline(node: Node, marks: InlineMarks = {}): RichEmailInline[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    return text ? [{ text, ...marks }] : []
  }
  if (!(node instanceof HTMLElement)) return []

  const tag = node.tagName.toLowerCase()
  if (tag === 'br') return [{ text: '\n', ...marks }]

  const next: InlineMarks = { ...marks }
  if (tag === 'strong' || tag === 'b') next.bold = true
  if (tag === 'em' || tag === 'i') next.italic = true
  if (tag === 'u') next.underline = true
  if (tag === 's' || tag === 'strike') next.strike = true
  if (tag === 'a') {
    const href = node.getAttribute('href')
    if (href && /^(https?:|mailto:|tel:)/i.test(href)) next.href = href
  }

  return Array.from(node.childNodes).flatMap((child) => collectInline(child, next))
}

export function richHtmlToEmailDocument(html: string): RichEmailDocument {
  if (!html || typeof document === 'undefined') return []
  const root = document.createElement('div')
  root.innerHTML = html
  const blocks: RichEmailDocument = []

  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const children = collectInline(node)
      if (children.some((part) => part.text.trim())) blocks.push({ type: 'paragraph', children })
      return
    }
    if (!(node instanceof HTMLElement)) return
    const tag = node.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child) => collectInline(child))
      blocks.push({ type: tag === 'ol' ? 'ordered-list' : 'unordered-list', items })
      return
    }

    const type = tag === 'h2'
      ? 'heading'
      : tag === 'h3'
        ? 'subheading'
        : tag === 'blockquote'
          ? 'blockquote'
          : 'paragraph'
    const children = collectInline(node)
    if (children.length) blocks.push({ type, children })
  })

  return blocks
}