import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  imageUrl?: string
  note?: string
  eventUrl?: string
}

export const EventCancelledEmail = ({
  name = 'there', eventTitle = 'This event', eventDate = '', eventLocation = '',
  imageUrl = '', note = '', eventUrl = 'https://www.planetbaltimore.com/events',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${eventTitle} has been cancelled`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>
        <Section style={card}>
          {imageUrl ? <Img src={imageUrl} alt={eventTitle} width="552" style={hero} /> : null}
          <Section style={inner}>
            <Text style={badge}>Event cancelled</Text>
            <Heading style={h1}>{eventTitle}</Heading>
            {eventDate ? <Text style={meta}>{eventDate}</Text> : null}
            {eventLocation ? <Text style={muted}>{eventLocation}</Text> : null}
            <Text style={body}>
              Hi {name}, the organizer has cancelled this event. Your RSVP or ticket is no longer needed.
            </Text>
            {note ? (
              <Section style={noteBox}>
                <Text style={noteLabel}>Message from the organizer</Text>
                <Text style={noteText}>{note}</Text>
              </Section>
            ) : null}
            <Button style={button} href={eventUrl}>View the event</Button>
            <Text style={hint}>If you paid for a ticket, the organizer will be in touch about your refund.</Text>
          </Section>
        </Section>
        <Text style={footer}>Planet Baltimore, tickets and stories from the city.</Text>
      </Container>
    </Body>
  </Html>
)

export default EventCancelledEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '28px 16px 40px', maxWidth: '584px' }
const brand = { color: '#111827', fontSize: '12px', fontWeight: '800', letterSpacing: '2px', margin: '0 0 16px', textAlign: 'center' as const }
const card = { backgroundColor: '#0a0a0a', borderRadius: '28px', overflow: 'hidden' as const }
const hero = { width: '100%', maxHeight: '260px', objectFit: 'cover' as const, display: 'block', filter: 'grayscale(100%)', opacity: 0.75 }
const inner = { padding: '24px' }
const badge = { display: 'inline-block', backgroundColor: '#b91c1c', color: '#ffffff', borderRadius: '9999px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.6px', padding: '6px 12px', margin: '0 0 14px', textTransform: 'uppercase' as const }
const h1 = { color: '#ffffff', fontSize: '26px', lineHeight: '32px', fontWeight: '800', margin: '0 0 8px' }
const meta = { color: '#e5e5e5', fontSize: '15px', margin: '0 0 2px' }
const muted = { color: '#8f8f8f', fontSize: '14px', margin: '0' }
const body = { color: '#e5e5e5', fontSize: '15px', lineHeight: '22px', margin: '18px 0 0' }
const noteBox = { backgroundColor: '#151515', border: '1px solid #262626', borderRadius: '12px', padding: '12px 14px', margin: '14px 0 0' }
const noteLabel = { color: '#7a7a7a', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase' as const, margin: '0 0 6px' }
const noteText = { color: '#ffffff', fontSize: '15px', lineHeight: '22px', margin: '0', whiteSpace: 'pre-wrap' as const }
const button = { backgroundColor: '#ffffff', borderRadius: '9999px', color: '#0a0a0a', fontSize: '15px', fontWeight: '700', padding: '14px 28px', textDecoration: 'none', display: 'block', margin: '18px 0 10px', textAlign: 'center' as const }
const hint = { color: '#7a7a7a', fontSize: '13px', lineHeight: '19px', margin: '0', textAlign: 'center' as const }
const footer = { color: '#b3b3b3', fontSize: '12px', textAlign: 'center' as const, margin: '20px 0 0' }

export const template = {
  component: EventCancelledEmail,
  subject: (data: Record<string, any>) => `Cancelled: ${data['eventTitle'] || 'an event you RSVPed to'}`,
  displayName: 'Event Cancelled',
  previewData: { name: 'Terell', eventTitle: 'Boom Selecta at The Crown', eventDate: 'Friday, Sept 12 at 9:00 PM', note: 'Weather forced us to call it off. See you next month!' },
} satisfies TemplateEntry
