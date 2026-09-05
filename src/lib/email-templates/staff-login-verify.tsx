import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface StaffLoginVerifyProps {
  code?: string
  pageName?: string
}

export const StaffLoginVerifyEmail = ({
  code = '000000',
  pageName = 'your page',
}: StaffLoginVerifyProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your Planet Baltimore staff login code for ${pageName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verify your staff login</Heading>
        <Text style={text}>
          A staff login was created for {pageName} on Planet Baltimore with this email address.
          Enter the code below to confirm it. The code expires in 30 minutes.
        </Text>
        <Text style={codeStyle}>{code}</Text>
        <Text style={text}>
          Verifying keeps this login recoverable, so you can reset the password later if you ever get locked out.
        </Text>
        <Text style={footer}>If you were not expecting this, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default StaffLoginVerifyEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }
const container = { margin: '0 auto', padding: '32px 24px', maxWidth: '560px' }
const h1 = { color: '#1f2937', fontSize: '22px', fontWeight: '700', margin: '0 0 16px' }
const text = { color: '#374151', fontSize: '15px', lineHeight: '24px' }
const codeStyle = {
  color: '#d4580a', fontSize: '32px', fontWeight: '700', letterSpacing: '6px', margin: '20px 0',
}
const footer = { color: '#9ca3af', fontSize: '12px', lineHeight: '18px' }

export const template = {
  component: StaffLoginVerifyEmail,
  subject: (data: Record<string, any>) => `${data['code'] || ''} is your Planet Baltimore staff login code`,
  displayName: 'Staff Login Verification',
  previewData: { code: '482913', pageName: "Joe's Cafe" },
} satisfies TemplateEntry
