import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ArtistInquiryProps {
  intent?: string
  senderName?: string
  senderEmail?: string
  message?: string
  pageName?: string
  pageUrl?: string
}

export const ArtistInquiryEmail = ({
  intent = 'General',
  senderName = 'Someone',
  senderEmail = '',
  message = '',
  pageName = 'your page',
  pageUrl = 'https://www.planetbaltimore.com',
}: ArtistInquiryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${intent} inquiry from ${senderName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge}>{intent}</Text>
        <Heading style={h1}>New message about {pageName}</Heading>
        <Text style={text}><strong>{senderName}</strong>{senderEmail ? ` (${senderEmail})` : ''} wrote:</Text>
        <Text style={quote}>{message}</Text>
        <Hr style={hr} />
        <Button style={button} href={pageUrl}>Open Planet Baltimore</Button>
        <Text style={footer}>
          You are getting this because you manage {pageName} on Planet Baltimore.
          Reply to this email to answer {senderName} directly.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ArtistInquiryEmail

const main = { backgroundColor: '#faf8f5', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const badge = {
  display: 'inline-block', backgroundColor: '#f3e3da', color: '#a2441f', borderRadius: '9999px',
  fontSize: '11px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  padding: '4px 12px', margin: '0 0 12px',
}
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px' }
const quote = {
  color: '#1f2937', fontSize: '15px', lineHeight: '24px', whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #d47b5b', padding: '4px 0 4px 14px', margin: '8px 0 20px',
}
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const button = {
  backgroundColor: '#d47b5b', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '600', padding: '12px 24px', textDecoration: 'none', display: 'inline-block', margin: '0 0 20px',
}
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: ArtistInquiryEmail,
  subject: (data: Record<string, any>) =>
    `${data['intent'] || 'General'} inquiry from ${data['senderName'] || 'someone'}`,
  displayName: 'Page Inquiry',
  previewData: {
    intent: 'Booking',
    senderName: 'Jordan Miles',
    senderEmail: 'jordan@example.com',
    message: 'Would you be available for a set on the first Friday in June?',
    pageName: 'Terell Reed',
    pageUrl: 'https://www.planetbaltimore.com/o/terell-reed',
  },
} satisfies TemplateEntry
