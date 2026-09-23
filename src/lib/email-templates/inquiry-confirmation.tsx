import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  intent?: string
  senderName?: string
  message?: string
  pageName?: string
  pageUrl?: string
}

export const InquiryConfirmationEmail = ({
  intent = 'General',
  senderName = '',
  message = '',
  pageName = 'the page',
  pageUrl = 'https://www.planetbaltimore.com',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your message to ${pageName} was sent`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge}>{intent}</Text>
        <Heading style={h1}>Your message to {pageName} was sent</Heading>
        <Text style={text}>
          {senderName ? `Hi ${senderName}, thanks` : 'Thanks'} for reaching out. {pageName} has your message and
          will reply to this email address directly.
        </Text>
        <Text style={text}>Here is a copy of what you sent:</Text>
        <Text style={quote}>{message}</Text>
        <Hr style={hr} />
        <Button style={button} href={pageUrl}>View {pageName}</Button>
        <Text style={footer}>You are getting this because you sent an inquiry on Planet Baltimore.</Text>
      </Container>
    </Body>
  </Html>
)

export default InquiryConfirmationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
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
  component: InquiryConfirmationEmail,
  subject: (data: Record<string, any>) => `Your message to ${data['pageName'] || 'Planet Baltimore'} was sent`,
  displayName: 'Inquiry Confirmation',
  previewData: {
    intent: 'Booking',
    senderName: 'Jordan',
    message: 'Would you be available for a set on the first Friday in June?',
    pageName: 'Terell Reed',
    pageUrl: 'https://www.planetbaltimore.com/o/terell-reed',
  },
} satisfies TemplateEntry
