import * as React from 'react'
import {
  Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface TicketConfirmationProps {
  buyerName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  imageUrl?: string
  quantity?: number
  totalPaid?: string
  ticketUrl?: string
  pdfUrl?: string
  ticketCodes?: string[]
}

export const TicketConfirmationEmail = ({
  buyerName = 'there',
  eventTitle = 'Your event',
  eventDate = '',
  eventLocation = '',
  imageUrl = '',
  quantity = 1,
  totalPaid = '',
  ticketUrl = 'https://www.planetbaltimore.com/tickets',
  pdfUrl = '',
  ticketCodes = [],
}: TicketConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`You're in: ${eventTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>

        <Section style={stub}>
          {imageUrl ? (
            <Img src={imageUrl} alt={eventTitle} width="552" style={hero} />
          ) : null}

          <Section style={stubTop}>
            <Text style={badge}>
              {quantity > 1 ? `${quantity} tickets confirmed` : 'Ticket confirmed'}
            </Text>
            <Heading style={h1}>{eventTitle}</Heading>
            {eventDate ? <Text style={meta}>{eventDate}</Text> : null}
            {eventLocation ? <Text style={metaMuted}>{eventLocation}</Text> : null}
          </Section>

          <Section style={perfWrap}>
            <Row>
              <Column style={notchLeft} />
              <Column style={perfLine} />
              <Column style={notchRight} />
            </Row>
          </Section>

          <Section style={stubBottom}>
            <Row>
              <Column style={cell}>
                <Text style={cellLabel}>Name</Text>
                <Text style={cellValue}>{buyerName}</Text>
              </Column>
              <Column style={cell}>
                <Text style={cellLabel}>Tickets</Text>
                <Text style={cellValue}>{quantity}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={cell}>
                <Text style={cellLabel}>Total</Text>
                <Text style={cellValue}>{totalPaid || 'Free'}</Text>
              </Column>
              <Column style={cell}>
                <Text style={cellLabel}>Status</Text>
                <Text style={cellValue}>Not checked in</Text>
              </Column>
            </Row>
            {ticketCodes.length ? (
              <Text style={codeStrip}>{ticketCodes.join('   •   ')}</Text>
            ) : null}

            <Button style={button} href={ticketUrl}>View your QR ticket</Button>
            {pdfUrl ? (
              <Button style={buttonGhost} href={pdfUrl}>Download PDF ticket</Button>
            ) : null}
            <Text style={hint}>Show the QR code at the door, or print the PDF. Each ticket has its own code.</Text>
          </Section>
        </Section>

        <Text style={footer}>Planet Baltimore, tickets and stories from the city.</Text>
      </Container>
    </Body>
  </Html>
)

export default TicketConfirmationEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}
const container = { margin: '0 auto', padding: '28px 16px 40px', maxWidth: '584px' }
const brand = {
  color: '#111827', fontSize: '12px', fontWeight: '800', letterSpacing: '2px',
  margin: '0 0 16px', textAlign: 'center' as const,
}
const stub = {
  backgroundColor: '#0a0a0a', borderRadius: '28px', overflow: 'hidden' as const,
  border: '1px solid #1f1f1f',
}
const hero = { width: '100%', maxHeight: '260px', objectFit: 'cover' as const, display: 'block' }
const stubTop = { padding: '24px 24px 18px' }
const badge = {
  display: 'inline-block', backgroundColor: '#ffffff', color: '#0a0a0a', borderRadius: '9999px',
  fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', padding: '6px 12px', margin: '0 0 14px',
  textTransform: 'uppercase' as const,
}
const h1 = { color: '#ffffff', fontSize: '26px', lineHeight: '32px', fontWeight: '800', margin: '0 0 8px' }
const meta = { color: '#e5e5e5', fontSize: '15px', lineHeight: '22px', margin: '0 0 2px' }
const metaMuted = { color: '#8f8f8f', fontSize: '14px', lineHeight: '20px', margin: '0' }
const perfWrap = { padding: '0' }
const notchLeft = {
  width: '18px', height: '18px', backgroundColor: '#ffffff',
  borderRadius: '0 9999px 9999px 0',
}
const notchRight = {
  width: '18px', height: '18px', backgroundColor: '#ffffff',
  borderRadius: '9999px 0 0 9999px',
}
const perfLine = { borderTop: '1px dashed #303030', height: '1px' }
const stubBottom = { padding: '20px 24px 26px' }
const cell = { padding: '0 8px 14px 0', verticalAlign: 'top' as const, width: '50%' }
const cellLabel = {
  color: '#7a7a7a', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}
const cellValue = { color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: '0' }
const codeStrip = {
  backgroundColor: '#151515', border: '1px solid #262626', borderRadius: '12px',
  color: '#d4d4d4', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '13px', letterSpacing: '1px', padding: '10px 12px', margin: '4px 0 0',
  textAlign: 'center' as const,
}
const button = {
  backgroundColor: '#ffffff', borderRadius: '9999px', color: '#0a0a0a', fontSize: '15px',
  fontWeight: '700', padding: '14px 28px', textDecoration: 'none', display: 'block',
  margin: '18px 0 10px', textAlign: 'center' as const,
}
const buttonGhost = {
  backgroundColor: '#151515', border: '1px solid #303030', borderRadius: '9999px', color: '#ffffff',
  fontSize: '15px', fontWeight: '700', padding: '13px 28px', textDecoration: 'none', display: 'block',
  margin: '0 0 12px', textAlign: 'center' as const,
}
const hint = { color: '#7a7a7a', fontSize: '13px', lineHeight: '19px', margin: '0', textAlign: 'center' as const }
const footer = { color: '#b3b3b3', fontSize: '12px', textAlign: 'center' as const, margin: '20px 0 0' }

export const template = {
  component: TicketConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `Your ticket${(data['quantity'] ?? 1) > 1 ? 's' : ''} for ${data['eventTitle'] || 'your event'}`,
  displayName: 'Ticket Confirmation',
  previewData: {
    buyerName: 'Terell',
    eventTitle: 'Boom Selecta at The Crown',
    eventDate: 'Friday, Sept 12 at 9:00 PM',
    eventLocation: 'The Crown, 1910 N Charles St',
    imageUrl: '',
    quantity: 2,
    totalPaid: '$40.00',
    ticketUrl: 'https://www.planetbaltimore.com/tickets',
    pdfUrl: 'https://www.planetbaltimore.com/ticket.pdf',
    ticketCodes: ['A1B2C3D4', 'E5F6G7H8'],
  },
} satisfies TemplateEntry
