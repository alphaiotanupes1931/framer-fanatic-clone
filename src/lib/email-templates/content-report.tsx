import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
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
    <Preview>{`New ${contentType} report: ${reason}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New content report</Heading>
        <Text style={text}><strong>Type:</strong> {contentType}</Text>
        <Text style={text}><strong>Reported by:</strong> {reporterName}</Text>
        <Text style={text}><strong>Reason:</strong> {reason}</Text>
        {details ? <Text style={text}><strong>Details:</strong> {details}</Text> : null}
        <Text style={text}><strong>Content:</strong> {contentUrl}</Text>
        {contentId ? <Text style={footer}>Content ID: {contentId}</Text> : null}
        <Button style={button} href={reviewUrl}>Review in admin</Button>
        <Text style={footer}>You are getting this because you moderate Planet Baltimore.</Text>
      </Container>
    </Body>
  </Html>
)

export default ContentReportEmail

const main = { backgroundColor: '#faf8f5', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px', margin: '0 0 8px' }
const button = {
  backgroundColor: '#d4580a', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '600', padding: '12px 24px', textDecoration: 'none', display: 'inline-block', margin: '16px 0 20px',
}
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: ContentReportEmail,
  subject: (data: Record<string, any>) =>
    `Report: ${data['contentType'] || 'content'} - ${data['reason'] || 'flagged'}`,
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
