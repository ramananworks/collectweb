/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your CollectWeb verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to CollectWeb 👋</Heading>
        <Text style={text}>
          Thanks for signing up! Enter the code below in the app to verify your
          email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) and activate your account:
        </Text>
        {token ? (
          <Text style={otpCode}>{token}</Text>
        ) : (
          <Text style={text}>
            <Link href={confirmationUrl} style={link}>
              Click here to verify
            </Link>
          </Text>
        )}
        <Text style={text}>This code expires in 10 minutes.</Text>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(240, 5%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const otpCode = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  color: 'hsl(160, 84%, 39%)',
  padding: '16px 0',
  margin: '0 0 25px',
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
