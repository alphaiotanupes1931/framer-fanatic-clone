import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
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
  ticketCodes = [],
}: TicketConfirmationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`You're in: ${eventTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>

        <Section style={card}>
          {imageUrl ? (
            <Img src={imageUrl} alt={eventTitle} width="552" style={hero} />
          ) : null}
          <Section style={cardBody}>
            <Text style={badge}>{quantity > 1 ? `${quantity} tickets confirmed` : 'Ticket confirmed'}</Text>
            <Heading style={h1}>{eventTitle}</Heading>
            {eventDate ? <Text style={meta}>{eventDate}</Text> : null}
            {eventLocation ? <Text style={meta}>{eventLocation}</Text> : null}

            <Hr style={hr} />

            <Text style={row}><span style={label}>Name</span>{buyerName}</Text>
            <Text style={row}><span style={label}>Tickets</span>{quantity}</Text>
            {totalPaid ? <Text style={row}><span style={label}>Total</span>{totalPaid}</Text> : null}
            {ticketCodes.length ? (
              <Text style={row}><span style={label}>Ticket ID</span>{ticketCodes.join(', ')}</Text>
            ) : null}

            <Button style={button} href={ticketUrl}>View your QR ticket</Button>
            <Text style={hint}>
              Show the QR code at the door. Each ticket has its own code.
            </Text>
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
const card = {
  border: '1px solid #ececec', borderRadius: '18px', overflow: 'hidden' as const,
  backgroundColor: '#ffffff',
}
const hero = { width: '100%', maxHeight: '300px', objectFit: 'cover' as const, display: 'block' }
const cardBody = { padding: '24px' }
const badge = {
  display: 'inline-block', backgroundColor: '#111827', color: '#ffffff', borderRadius: '9999px',
  fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', padding: '6px 12px', margin: '0 0 14px',
  textTransform: 'uppercase' as const,
}
const h1 = { color: '#0f172a', fontSize: '26px', lineHeight: '32px', fontWeight: '800', margin: '0 0 8px' }
const meta = { color: '#6b7280', fontSize: '15px', lineHeight: '22px', margin: '0 0 2px' }
const hr = { borderColor: '#f0f0f0', margin: '20px 0' }
const row = { color: '#111827', fontSize: '15px', lineHeight: '22px', margin: '0 0 8px' }
const label = { color: '#9ca3af', fontSize: '13px', display: 'inline-block', width: '90px' }
const button = {
  backgroundColor: '#d4580a', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '700', padding: '14px 28px', textDecoration: 'none', display: 'inline-block',
  margin: '18px 0 10px',
}
const hint = { color: '#9ca3af', fontSize: '13px', lineHeight: '19px', margin: '0' }
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
    ticketCodes: ['A1B2C3D4', 'E5F6G7H8'],
  },
} satisfies TemplateEntry
