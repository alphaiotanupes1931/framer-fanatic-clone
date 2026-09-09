import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface MissingItem {
  label: string
  hint: string
}

interface ProfileCompletionProps {
  name?: string
  percent?: number
  missing?: MissingItem[]
  profileUrl?: string
}

export const ProfileCompletionEmail = ({
  name = 'there',
  percent = 60,
  missing = [],
  profileUrl = 'https://www.planetbaltimore.com/edit-profile',
}: ProfileCompletionProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your Planet Baltimore profile is ${percent}% complete`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>PLANET BALTIMORE</Text>

        <Heading style={h1}>Your profile is {percent}% complete</Heading>
        <Text style={text}>
          Hi {name}, a finished profile gets seen more. Here is what is still missing.
        </Text>

        <Section style={barTrack}>
          <Section style={{ ...barFill, width: `${Math.max(4, Math.min(100, percent))}%` }}>
            <Text style={barSpacer}>&nbsp;</Text>
          </Section>
        </Section>

        {missing.map((item) => (
          <Section key={item.label} style={row}>
            <Text style={rowTitle}>{item.label}</Text>
            <Text style={rowHint}>{item.hint}</Text>
          </Section>
        ))}

        <Button style={button} href={profileUrl}>
          Finish my profile
        </Button>

        <Hr style={hr} />
        <Text style={footer}>
          You get this reminder once a week until your profile is complete.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ProfileCompletionEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, -apple-system, Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '520px' }
const brand = { color: '#111827', fontSize: '12px', fontWeight: '700', letterSpacing: '2px', margin: '0 0 24px' }
const h1 = { color: '#111827', fontSize: '24px', fontWeight: '700', margin: '0 0 8px', lineHeight: '30px' }
const text = { color: '#4b5563', fontSize: '15px', lineHeight: '23px', margin: '0 0 20px' }
const barTrack = { backgroundColor: '#f0f0f0', borderRadius: '999px', overflow: 'hidden' as const, margin: '0 0 24px' }
const barFill = { backgroundColor: '#ed4204', borderRadius: '999px' }
const barSpacer = { fontSize: '1px', lineHeight: '8px', margin: '0' }
const row = { borderTop: '1px solid #efefef', padding: '14px 0' }
const rowTitle = { color: '#111827', fontSize: '15px', fontWeight: '600', margin: '0 0 2px' }
const rowHint = { color: '#767676', fontSize: '13px', lineHeight: '19px', margin: '0' }
const button = {
  backgroundColor: '#ed4204', borderRadius: '10px', color: '#ffffff', display: 'block',
  fontSize: '15px', fontWeight: '600', margin: '28px 0 0', padding: '13px 0',
  textAlign: 'center' as const, textDecoration: 'none',
}
const hr = { borderColor: '#efefef', margin: '32px 0 16px' }
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px', margin: '0' }

export const template = {
  component: ProfileCompletionEmail,
  subject: (data: Record<string, any>) =>
    `Your profile is ${data['percent'] ?? 0}% complete`,
  displayName: 'Profile Completion Reminder',
  previewData: {
    name: 'Terell',
    percent: 66,
    missing: [
      { label: 'Cover photo', hint: 'A banner image makes your page feel like yours.' },
      { label: 'Bio', hint: 'A line or two about what you do.' },
    ],
    profileUrl: 'https://www.planetbaltimore.com/edit-profile',
  },
} satisfies TemplateEntry
