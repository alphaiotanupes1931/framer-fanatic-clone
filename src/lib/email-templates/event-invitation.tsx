import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import type { RichEmailDocument, RichEmailInline } from '@/lib/rich-email'

interface EventInvitationProps {
  fromName?: string
  subject?: string
  messageDocument?: RichEmailDocument
  eventTitle?: string
  eventUrl?: string
}

export const EventInvitationEmail = ({
  fromName = 'Planet Baltimore',
  subject = 'You are invited',
  messageDocument = [],
  eventTitle = 'View event details',
  eventUrl = 'https://www.planetbaltimore.com/events',
}: EventInvitationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>
        <Heading style={heading}>{subject}</Heading>
        <Section style={letter}>
          {messageDocument.map((block, index) => {
            const content = block.children ? renderInline(block.children) : null
            if (block.type === 'heading') return <Text key={index} style={messageHeading}>{content}</Text>
            if (block.type === 'subheading') return <Text key={index} style={messageSubheading}>{content}</Text>
            if (block.type === 'blockquote') return <Text key={index} style={messageBlockquote}>{content}</Text>
            if (block.type === 'unordered-list' || block.type === 'ordered-list') {
              return (
                <Section key={index} style={messageList}>
                  {(block.items ?? []).map((item, itemIndex) => (
                    <Text key={itemIndex} style={messageListItem}>
                      {block.type === 'ordered-list' ? `${itemIndex + 1}. ` : '• '}{renderInline(item)}
                    </Text>
                  ))}
                </Section>
              )
            }
            return <Text key={index} style={messageParagraph}>{content}</Text>
          })}
        </Section>
        <Button style={button} href={eventUrl}>{eventTitle}</Button>
        <Text style={signature}>Sent by {fromName}</Text>
      </Container>
    </Body>
  </Html>
)

function renderInline(parts: RichEmailInline[]) {
  return parts.map((part, index) => {
    const style = {
      fontWeight: part.bold ? '700' : undefined,
      fontStyle: part.italic ? 'italic' : undefined,
      textDecoration: [part.underline ? 'underline' : '', part.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
      whiteSpace: 'pre-wrap' as const,
    }
    return part.href
      ? <Link key={index} href={part.href} style={{ ...style, color: '#b45309' }}>{part.text}</Link>
      : <React.Fragment key={index}><span style={style}>{part.text}</span></React.Fragment>
  })
}

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '600px' }
const brand = { color: '#b45309', fontSize: '12px', fontWeight: '700', letterSpacing: '1px', margin: '0 0 16px' }
const heading = { color: '#171717', fontSize: '24px', fontWeight: '700', lineHeight: '32px', margin: '0 0 20px' }
const letter = { color: '#404040', margin: '0 0 24px' }
const messageParagraph = { margin: '0 0 14px', fontSize: '16px', lineHeight: '26px' }
const messageHeading = { margin: '0 0 12px', fontSize: '21px', lineHeight: '28px', fontWeight: '700' }
const messageSubheading = { margin: '0 0 10px', fontSize: '18px', lineHeight: '26px', fontWeight: '700' }
const messageBlockquote = { margin: '0 0 14px', paddingLeft: '14px', borderLeft: '3px solid #d1d5db', fontStyle: 'italic', fontSize: '16px', lineHeight: '26px' }
const messageList = { margin: '0 0 14px', padding: '0' }
const messageListItem = { margin: '0 0 6px', fontSize: '16px', lineHeight: '24px' }
const button = { backgroundColor: '#d4580a', borderRadius: '9999px', color: '#ffffff', fontSize: '15px', fontWeight: '700', padding: '12px 22px', textDecoration: 'none', display: 'inline-block', margin: '0 0 20px' }
const signature = { color: '#737373', fontSize: '13px', lineHeight: '20px' }

export const template = {
  component: EventInvitationEmail,
  subject: (data: Record<string, any>) => data['subject'] || 'You are invited',
  displayName: 'Event Invitation',
  previewData: {
    fromName: 'Planet Baltimore',
    subject: 'You are invited',
    messageDocument: [{ type: 'paragraph', children: [{ text: 'We would love to see you there.' }] }],
    eventTitle: 'View event details and tickets',
    eventUrl: 'https://www.planetbaltimore.com/events',
  },
} satisfies TemplateEntry