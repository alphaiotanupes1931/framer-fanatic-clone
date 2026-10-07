import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ContentReportProps {
  reporterName?: string
  contentType?: string
  contentId?: string
  reason?: string
  details?: string
  contentUrl?: string
  reviewUrl?: string
}

export const ContentReportEmail = ({
  reporterName = 'A member',
  contentType = 'post',
  contentId = '',
  reason = 'Not specified',
  details = '',
  contentUrl = 'https://www.planetbaltimore.com',
  reviewUrl = 'https://www.planetbaltimore.com/reports',
}: ContentReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`A ${contentType} was flagged: ${reason}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>
        <Section style={card}>
          <Text style={badge}>Flagged {contentType}</Text>
          <Heading style={h1}>Someone flagged a {contentType}</Heading>
          <Text style={lead}>{reporterName} reported this {contentType}. Take a look when you can.</Text>
          <Section style={reasonBox}>
            <Text style={label}>Reason</Text>
            <Text style={value}>{reason}</Text>
            {details ? (<><Text style={label}>Their note</Text><Text style={quote}>"{details}"</Text></>) : null}
          </Section>
          <Button style={button} href={contentUrl}>View the {contentType}</Button>
          <Text style={secondary}><Link href={reviewUrl} style={link}>Open all reports</Link></Text>
        </Section>
        <Text style={footer}>You get this email because you moderate Planet Baltimore.{contentId ? ` Ref: ${contentId.slice(0, 8)}` : ''}</Text>
      </Container>
    </Body>
  </Html>
)

export default ContentReportEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '32px 20px', maxWidth: '520px' }
const brand = { color: '#d4580a', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', margin: '0 0 16px', textAlign: 'center' as const }
const card = { border: '1px solid #eee7df', borderRadius: '16px', padding: '28px 24px', backgroundColor: '#fffaf5' }
const badge = { display: 'inline-block', backgroundColor: '#fde7d6', color: '#b4470a', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', padding: '4px 12px', margin: '0 0 12px', textTransform: 'capitalize' as const }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 8px' }
const lead = { color: '#4b5563', fontSize: '15px', lineHeight: '22px', margin: '0 0 20px' }
const reasonBox = { backgroundColor: '#ffffff', border: '1px solid #eee7df', borderRadius: '12px', padding: '14px 16px', margin: '0 0 22px' }
const label = { color: '#9ca3af', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' as const, margin: '0 0 2px' }
const value = { color: '#111827', fontSize: '15px', fontWeight: '600', margin: '0 0 10px' }
const quote = { color: '#374151', fontSize: '14px', fontStyle: 'italic', lineHeight: '21px', margin: '0' }
const button = {
  backgroundColor: '#d4580a', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '600', padding: '12px 26px', textDecoration: 'none', display: 'inline-block',
}
const secondary = { fontSize: '13px', margin: '14px 0 0' }
const link = { color: '#d4580a', textDecoration: 'underline' }
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px', textAlign: 'center' as const, margin: '18px 0 0' }

export const template = {
  component: ContentReportEmail,
  subject: (data: Record<string, any>) =>
    `A ${data['contentType'] || 'post'} was flagged: ${data['reason'] || 'needs review'}`,
  displayName: 'Content Report',
  to: 'ainsleyburrows7@gmail.com',
  previewData: {
    reporterName: 'Jordan',
    contentType: 'post',
    contentId: '00000000-0000-0000-0000-000000000000',
    reason: 'Spam or misleading',
    details: 'Looks like a scam link.',
    contentUrl: 'https://www.planetbaltimore.com/posts/123',
    reviewUrl: 'https://www.planetbaltimore.com/reports',
  },
} satisfies TemplateEntry
