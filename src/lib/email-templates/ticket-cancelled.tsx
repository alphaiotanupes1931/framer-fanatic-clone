import * as React from 'react'
import {
  Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface TicketCancelledProps {
  buyerName?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  imageUrl?: string
  quantity?: number
  eventUrl?: string
  ticketCodes?: string[]
  reason?: 'cancelled' | 'refunded'
  refundAmount?: string
  pdfUrl?: string
}

export const TicketCancelledEmail = ({
  buyerName = 'there',
  eventTitle = 'Your event',
  eventDate = '',
  eventLocation = '',
  imageUrl = '',
  quantity = 1,
  eventUrl = 'https://www.planetbaltimore.com/events',
  ticketCodes = [],
  reason = 'cancelled',
  refundAmount = '',
  pdfUrl = '',
}: TicketCancelledProps) => {
  const refunded = reason === 'refunded'
  return (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{refunded
      ? `Your refund for ${eventTitle} is confirmed`
      : `Your RSVP for ${eventTitle} is cancelled`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>

        <Section style={stub}>
          {imageUrl ? (
            <Img src={imageUrl} alt={eventTitle} width="552" style={hero} />
          ) : null}

          <Section style={stubTop}>
            <Text style={badge}>
              {refunded
                ? quantity > 1 ? `${quantity} tickets refunded` : 'Ticket refunded'
                : quantity > 1 ? `${quantity} tickets cancelled` : 'RSVP cancelled'}
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
                <Text style={cellLabel}>{refunded ? 'Refunded' : 'Released'}</Text>
                <Text style={cellValue}>{refunded && refundAmount ? refundAmount : quantity}</Text>
              </Column>
            </Row>
            <Row>
              <Column style={cell}>
                <Text style={cellLabel}>Status</Text>
                <Text style={cellValueRed}>{refunded ? 'Refunded' : 'Cancelled'}</Text>
              </Column>
              <Column style={cell}>
                <Text style={cellLabel}>Entry</Text>
                <Text style={cellValue}>QR no longer valid</Text>
              </Column>
            </Row>
            {ticketCodes.length ? (
              <Text style={codeStrip}>{ticketCodes.join('   •   ')}</Text>
            ) : null}

            <Text style={notice}>
              {refunded
                ? `Your refund${refundAmount ? ` of ${refundAmount}` : ''} is on its way back to your original payment method, and typically lands within 5 to 10 business days. Your QR code will not scan at the door.`
                : 'Your spot has been released and your QR code will not scan at the door.'}
            </Text>

            {pdfUrl ? (
              <Text style={hint}>
                Your saved PDF ticket has been updated and now shows as{' '}
                {refunded ? 'refunded' : 'cancelled'}.
              </Text>
            ) : null}

            <Button style={button} href={eventUrl}>
              {refunded ? 'View the event' : 'Change your mind? RSVP again'}
            </Button>
            <Text style={hint}>
              {refunded
                ? 'Questions about this refund? Just reply to this email.'
                : 'If you did not cancel this, reply to this email and we will help.'}
            </Text>
          </Section>
        </Section>

        <Text style={footer}>Planet Baltimore, tickets and stories from the city.</Text>
      </Container>
    </Body>
  </Html>
  )
}

export default TicketCancelledEmail

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
const hero = {
  width: '100%', maxHeight: '260px', objectFit: 'cover' as const, display: 'block',
  filter: 'grayscale(100%)', opacity: 0.75,
}
const stubTop = { padding: '24px 24px 18px' }
const badge = {
  display: 'inline-block', backgroundColor: '#b91c1c', color: '#ffffff', borderRadius: '9999px',
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
const cellValueRed = { color: '#f87171', fontSize: '15px', fontWeight: '700', margin: '0' }
const codeStrip = {
  backgroundColor: '#151515', border: '1px solid #262626', borderRadius: '12px',
  color: '#8f8f8f', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '13px', letterSpacing: '1px', padding: '10px 12px', margin: '4px 0 0',
  textAlign: 'center' as const, textDecoration: 'line-through',
}
const notice = {
  backgroundColor: '#1f1010', color: '#fca5a5', fontSize: '14px', lineHeight: '20px',
  border: '1px solid #3b1717', borderRadius: '12px', padding: '12px 14px', margin: '14px 0 0',
}
const button = {
  backgroundColor: '#ffffff', borderRadius: '9999px', color: '#0a0a0a', fontSize: '15px',
  fontWeight: '700', padding: '14px 28px', textDecoration: 'none', display: 'block',
  margin: '18px 0 10px', textAlign: 'center' as const,
}
const hint = { color: '#7a7a7a', fontSize: '13px', lineHeight: '19px', margin: '0', textAlign: 'center' as const }
const footer = { color: '#b3b3b3', fontSize: '12px', textAlign: 'center' as const, margin: '20px 0 0' }

export const template = {
  component: TicketCancelledEmail,
  subject: (data: Record<string, any>) =>
    `Cancelled: your RSVP for ${data['eventTitle'] || 'your event'}`,
  displayName: 'Ticket Cancelled',
  previewData: {
    buyerName: 'Terell',
    eventTitle: 'Boom Selecta at The Crown',
    eventDate: 'Friday, Sept 12 at 9:00 PM',
    eventLocation: 'The Crown, 1910 N Charles St',
    imageUrl: '',
    quantity: 1,
    eventUrl: 'https://www.planetbaltimore.com/events',
    ticketCodes: ['A1B2C3D4'],
  },
} satisfies TemplateEntry
