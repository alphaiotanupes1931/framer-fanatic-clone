import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface GroupJoinRequestProps {
  requesterName?: string
  groupName?: string
  groupUrl?: string
}

export const GroupJoinRequestEmail = ({
  requesterName = 'Someone',
  groupName = 'your group',
  groupUrl = 'https://www.planetbaltimore.com',
}: GroupJoinRequestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${requesterName} asked to join ${groupName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{requesterName} asked to join {groupName}</Heading>
        <Text style={text}>
          Open the Requests tab on your group page to approve or decline this request.
        </Text>
        <Button style={button} href={groupUrl}>Review request</Button>
        <Text style={footer}>You are getting this because you manage {groupName} on Planet Baltimore.</Text>
      </Container>
    </Body>
  </Html>
)

export default GroupJoinRequestEmail

const main = { backgroundColor: '#faf8f5', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px' }
const button = {
  backgroundColor: '#d47b5b', borderRadius: '9999px', color: '#ffffff', fontSize: '15px',
  fontWeight: '600', padding: '12px 24px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 20px',
}
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: GroupJoinRequestEmail,
  subject: (data: Record<string, any>) =>
    `${data['requesterName'] || 'Someone'} asked to join ${data['groupName'] || 'your group'}`,
  displayName: 'Group Join Request',
  previewData: {
    requesterName: 'Jordan',
    groupName: 'Founding 100',
    groupUrl: 'https://www.planetbaltimore.com/o/founding-100',
  },
} satisfies TemplateEntry
