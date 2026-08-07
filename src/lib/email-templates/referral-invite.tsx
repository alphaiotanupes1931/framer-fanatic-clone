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
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface ReferralInviteProps {
  inviterName?: string
  personalMessage?: string
  inviteUrl?: string
}

export const ReferralInviteEmail = ({
  inviterName = 'A friend',
  personalMessage = '',
  inviteUrl = 'https://www.planetbaltimore.com/invite',
}: ReferralInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{inviterName} invited you to Planet Baltimore</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{inviterName} invited you to Planet Baltimore</Heading>
        {personalMessage ? <Text style={quote}>{personalMessage}</Text> : null}
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
  fontStyle: 'italic',
}
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
    personalMessage: 'You would love this.',
    inviteUrl: 'https://www.planetbaltimore.com/invite',
  },
} satisfies TemplateEntry
