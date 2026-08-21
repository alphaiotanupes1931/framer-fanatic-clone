import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import QRCode from 'qrcode'

/** One page per ticket, styled to match the dark stub used in the app and emails. */
export interface TicketPdfInput {
  eventTitle: string
  eventDate: string
  eventLocation: string
  buyerName: string
  totalPaid: string
  tickets: { id: string; url: string }[]
}

const PAGE_W = 420
const PAGE_H = 640
const PAD = 32
const BLACK = rgb(0.039, 0.039, 0.039)
const WHITE = rgb(1, 1, 1)
const MUTED = rgb(0.56, 0.56, 0.56)
const LINE = rgb(0.19, 0.19, 0.19)

function clip(font: PDFFont, text: string, size: number, maxWidth: number): string {
  let out = text
  while (out.length > 3 && font.widthOfTextAtSize(out, size) > maxWidth) {
    out = out.slice(0, -1)
  }
  return out.length < text.length ? `${out.trimEnd()}...` : out
}

/** Wrap to at most `maxLines` lines, ellipsizing the last one. */
function wrap(font: PDFFont, text: string, size: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = next
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines) lines[maxLines - 1] = clip(font, lines[maxLines - 1]!, size, maxWidth)
  return lines
}

/** Draw the QR as vector squares so no raster encoder is needed in the Worker. */
function drawQr(page: PDFPage, value: string, x: number, y: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'Q' })
  const count = qr.modules.size
  const data = qr.modules.data
  const quiet = 2
  const cell = size / (count + quiet * 2)
  page.drawRectangle({ x, y, width: size, height: size, color: WHITE })
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!data[row * count + col]) continue
      page.drawRectangle({
        x: x + (col + quiet) * cell,
        y: y + size - (row + quiet + 1) * cell,
        width: cell,
        height: cell,
        color: rgb(0, 0, 0),
      })
    }
  }
}

export async function buildTicketPdf(input: TicketPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`${input.eventTitle} - Planet Baltimore ticket`)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const mono = await pdf.embedFont(StandardFonts.Courier)

  const total = input.tickets.length
  input.tickets.forEach((ticket, index) => {
    const page = pdf.addPage([PAGE_W, PAGE_H])
    const innerW = PAGE_W - PAD * 2

    // Card
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: WHITE })
    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      color: BLACK, borderColor: LINE, borderWidth: 1,
    })

    let y = PAGE_H - 56
    page.drawText('PLANET BALTIMORE', { x: PAD, y, size: 10, font: bold, color: WHITE })
    if (total > 1) {
      const label = `${index + 1} OF ${total}`
      page.drawText(label, {
        x: PAGE_W - PAD - bold.widthOfTextAtSize(label, 10), y, size: 10, font: bold, color: MUTED,
      })
    }

    y -= 34
    for (const line of wrap(bold, input.eventTitle, 20, innerW, 3)) {
      page.drawText(line, { x: PAD, y, size: 20, font: bold, color: WHITE })
      y -= 25
    }

    y -= 4
    if (input.eventDate) {
      page.drawText(clip(regular, input.eventDate, 11, innerW), { x: PAD, y, size: 11, font: regular, color: WHITE })
      y -= 16
    }
    if (input.eventLocation) {
      page.drawText(clip(regular, input.eventLocation, 11, innerW), { x: PAD, y, size: 11, font: regular, color: MUTED })
      y -= 16
    }

    // Perforation with side punch-outs
    y -= 14
    page.drawCircle({ x: 16, y, size: 9, color: WHITE })
    page.drawCircle({ x: PAGE_W - 16, y, size: 9, color: WHITE })
    for (let dx = PAD; dx < PAGE_W - PAD; dx += 10) {
      page.drawRectangle({ x: dx, y, width: 5, height: 1, color: LINE })
    }

    // QR
    const qrSize = 190
    const qrX = (PAGE_W - qrSize) / 2
    const qrY = y - 26 - qrSize
    page.drawRectangle({
      x: qrX - 10, y: qrY - 10, width: qrSize + 20, height: qrSize + 20,
      color: WHITE,
    })
    drawQr(page, ticket.url, qrX, qrY, qrSize)

    const code = ticket.id.slice(0, 8).toUpperCase()
    let ty = qrY - 30
    page.drawText(code, {
      x: (PAGE_W - mono.widthOfTextAtSize(code, 13)) / 2, y: ty, size: 13, font: mono, color: WHITE,
    })

    // Detail grid, anchored near the bottom so pages stay balanced
    ty = Math.min(ty - 32, 128)
    const cells: [string, string][] = [
      ['NAME', input.buyerName],
      ['TICKETS', String(total)],
      ['TOTAL', input.totalPaid || 'Free'],
      ['STATUS', 'Not checked in'],
    ]
    const colW = innerW / 2
    cells.forEach(([label, value], i) => {
      const cx = PAD + (i % 2) * colW
      const cy = ty - Math.floor(i / 2) * 38
      page.drawText(label, { x: cx, y: cy, size: 8, font: bold, color: MUTED })
      page.drawText(clip(bold, value, 12, colW - 12), { x: cx, y: cy - 15, size: 12, font: bold, color: WHITE })
    })

    const hint = 'Show this QR code at the door.'
    page.drawText(hint, {
      x: (PAGE_W - regular.widthOfTextAtSize(hint, 9)) / 2,
      y: 34, size: 9, font: regular, color: MUTED,
    })
  })

  return pdf.save()
}
