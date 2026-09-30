import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface AdminBroadcastProps {
  subject?: string
  message?: string
}

export const AdminBroadcastEmail = ({ subject = 'A message from Planet Baltimore', message = '' }: AdminBroadcastProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{subject}</Heading>
        {message.split(/\n{2,}/).map((para, i) => (
          <Text key={i} style={text}>
            {para.split('\n').map((line, j, arr) => (
              <React.Fragment key={j}>
                {line}
                {j < arr.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </Text>
        ))}
        <Text style={footer}>Sent by the Planet Baltimore team.</Text>
      </Container>
    </Body>
  </Html>
)

export default AdminBroadcastEmail

const main = { backgroundColor: '#faf8f5', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px', margin: '0 0 14px' }
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px', marginTop: '24px' }

export const template = {
  component: AdminBroadcastEmail,
  subject: (data: Record<string, any>) => String(data['subject'] || 'A message from Planet Baltimore'),
  displayName: 'Admin email blast',
  previewData: { subject: 'Hello from Planet Baltimore', message: 'This is a test message.\n\nThanks!' },
}
