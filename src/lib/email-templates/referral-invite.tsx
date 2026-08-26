import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Link,
  Section,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import type { RichEmailDocument, RichEmailInline } from '@/lib/rich-email'

interface ReferralInviteProps {
  inviterName?: string
  personalMessage?: string
  personalMessageIntro?: string
  personalMessageDocument?: RichEmailDocument
  inviteUrl?: string
}

export const ReferralInviteEmail = ({
  inviterName = 'A friend',
  personalMessage = '',
  personalMessageIntro = '',
  personalMessageDocument = [],
  inviteUrl = 'https://www.planetbaltimore.com/invite',
}: ReferralInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{inviterName} invited you to Planet Baltimore</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{inviterName} invited you to Planet Baltimore</Heading>
        {personalMessage || personalMessageIntro || personalMessageDocument.length ? (
          <Section style={quote}>
            {personalMessageIntro ? <Text style={messageParagraph}>{personalMessageIntro}</Text> : null}
            {personalMessageDocument.length
              ? personalMessageDocument.map((block, index) => {
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
                })
              : personalMessage ? <Text style={messageParagraph}>{personalMessage}</Text> : null}
          </Section>
        ) : null}
        <Text style={text}>
          Planet Baltimore is where the city's artists, residents, businesses and
          neighborhoods connect. Join through the link below and you both earn points.
        </Text>
        <Button style={button} href={inviteUrl}>
          Join Planet Baltimore
        </Button>
        <Text style={footer}>
          If you were not expecting this invite, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReferralInviteEmail

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

const main = { backgroundColor: '#faf8f5', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px' }
const quote = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  borderLeft: '3px solid #d47b5b',
  padding: '4px 0 4px 14px',
  margin: '0 0 16px',
}
const messageParagraph = { margin: '0 0 12px', fontSize: '15px', lineHeight: '24px' }
const messageHeading = { margin: '0 0 10px', fontSize: '19px', lineHeight: '26px', fontWeight: '700' }
const messageSubheading = { margin: '0 0 8px', fontSize: '17px', lineHeight: '24px', fontWeight: '700' }
const messageBlockquote = { margin: '0 0 12px', paddingLeft: '12px', borderLeft: '2px solid #d1d5db', fontStyle: 'italic', fontSize: '15px', lineHeight: '24px' }
const messageList = { margin: '0 0 12px', padding: '0' }
const messageListItem = { margin: '0 0 5px', fontSize: '15px', lineHeight: '22px' }
const button = {
  backgroundColor: '#d47b5b',
  borderRadius: '9999px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '8px 0 20px',
}
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: ReferralInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data['inviterName'] || 'A friend'} invited you to Planet Baltimore`,
  displayName: 'Referral Invite',
  previewData: {
    inviterName: 'Reed',
    personalMessageDocument: [
      { type: 'paragraph', children: [{ text: 'You would ', italic: true }, { text: 'love', bold: true }, { text: ' this.' }] },
    ],
    inviteUrl: 'https://www.planetbaltimore.com/invite',
  },
} satisfies TemplateEntry
