import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
}

const Email = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're verified — your DTT creator page is live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>DTT</Heading>
        <Heading style={h1}>You're approved!</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          Your identity check passed and your creator account is now live on DTT.
          You can upload teasers, fill your vault, and start earning right away.
        </Text>
        <Text style={text}>
          Creators keep 90% of every unlock — $18 of every $20 token. Upload a short
          teaser that ends on a hook to bring customers in the door.
        </Text>
        <Button style={button} href="https://dropthatthing.com">
          OPEN MY DASHBOARD
        </Button>
        <Text style={footer}>
          DTT — dropthatthing.com · Questions? Reply to this email or write to DTT Support.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "You're approved — your DTT creator page is live",
  displayName: 'Creator approved',
  previewData: { name: 'Jane' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '520px', margin: '0 auto' }
const brand = { color: '#e0447c', fontSize: '28px', letterSpacing: '4px', margin: '0 0 16px' }
const h1 = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '14px', lineHeight: '22px' }
const button = {
  backgroundColor: '#e0447c', color: '#ffffff', fontSize: '14px', fontWeight: 'bold',
  padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block',
  marginTop: '8px',
}
const footer = { color: '#888888', fontSize: '11px', marginTop: '24px' }
