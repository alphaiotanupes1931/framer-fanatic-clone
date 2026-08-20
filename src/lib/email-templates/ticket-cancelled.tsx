import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
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
}: TicketCancelledProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your RSVP for ${eventTitle} is cancelled`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>

        <Section style={card}>
          {imageUrl ? (
            <Img src={imageUrl} alt={eventTitle} width="552" style={hero} />
          ) : null}
          <Section style={cardBody}>
            <Text style={badge}>{quantity > 1 ? `${quantity} tickets cancelled` : 'RSVP cancelled'}</Text>
            <Heading style={h1}>{eventTitle}</Heading>
            {eventDate ? <Text style={meta}>{eventDate}</Text> : null}
            {eventLocation ? <Text style={meta}>{eventLocation}</Text> : null}

            <Hr style={hr} />

            <Text style={row}><span style={label}>Name</span>{buyerName}</Text>
            <Text style={row}><span style={label}>Released</span>{quantity}</Text>
            {ticketCodes.length ? (
              <Text style={row}><span style={label}>Ticket ID</span>{ticketCodes.join(', ')}</Text>
            ) : null}

            <Text style={notice}>
              Your spot has been released and your QR code is no longer valid at the door.
            </Text>

            <Button style={button} href={eventUrl}>Change your mind? RSVP again</Button>
            <Text style={hint}>If you did not cancel this, reply to this email and we will help.</Text>
          </Section>
        </Section>

        <Text style={footer}>Planet Baltimore, tickets and stories from the city.</Text>
      </Container>
    </Body>
  </Html>
)

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
const card = {
  border: '1px solid #ececec', borderRadius: '18px', overflow: 'hidden' as const,
  backgroundColor: '#ffffff',
}
const hero = { width: '100%', maxHeight: '300px', objectFit: 'cover' as const, display: 'block', filter: 'grayscale(100%)' }
const cardBody = { padding: '24px' }
const badge = {
  display: 'inline-block', backgroundColor: '#b91c1c', color: '#ffffff', borderRadius: '9999px',
  fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', padding: '6px 12px', margin: '0 0 14px',
  textTransform: 'uppercase' as const,
}
const h1 = { color: '#0f172a', fontSize: '26px', lineHeight: '32px', fontWeight: '800', margin: '0 0 8px' }
const meta = { color: '#6b7280', fontSize: '15px', lineHeight: '22px', margin: '0 0 2px' }
const hr = { borderColor: '#f0f0f0', margin: '20px 0' }
const row = { color: '#111827', fontSize: '15px', lineHeight: '22px', margin: '0 0 8px' }
const label = { color: '#9ca3af', fontSize: '13px', display: 'inline-block', width: '90px' }
const notice = {
  backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '14px', lineHeight: '20px',
  borderRadius: '12px', padding: '12px 14px', margin: '14px 0 0',
}
const button = {
  backgroundColor: '#111827', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '700', padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
  margin: '18px 0 10px',
}
const hint = { color: '#9ca3af', fontSize: '13px', lineHeight: '19px', margin: '0' }
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
