import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SECURITY_ALERT_RECIPIENT } from '../securityNotification.ts'

interface Props { eventType?: string; occurredAt?: string; eventId?: string }
const Email = ({ eventType, occurredAt, eventId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>DTT blocked an access attempt — review your private security alerts</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>DTT</Heading>
        <Heading style={heading}>Blocked access attempt</Heading>
        <Text style={text}>{eventType === 'admin_code_rejected' ? 'An administrator access code was rejected.' : 'A private identity-record access request was denied.'}</Text>
        <Text style={text}>Time (UTC): {occurredAt ?? 'See the private SECURITY view'}<br />Reference: {eventId ?? 'Unavailable'}</Text>
        <Text style={text}>If this was you, a wrong code or expired sign-in may explain it. If it was unexpected, review SECURITY from your administrator account and secure your account and email with two-factor authentication where available.</Text>
        <Text style={text}>This is a blocked request, not confirmation of a hack. These alerts cover administrator-code rejections and private identity-access denials only, not hosting incidents, ordinary login failures or copied content. Repeated events of the same kind are grouped into 15-minute notification windows; individual events remain in SECURITY.</Text>
        <Text style={text}>Open DTT using your usual saved address. No passwords, identity documents or private media are included in this email.</Text>
      </Container>
    </Body>
  </Html>
)
export const template = {
  component: Email,
  subject: 'DTT security alert: access attempt blocked',
  displayName: 'Private security alert',
  to: SECURITY_ALERT_RECIPIENT,
  previewData: { eventType: 'admin_code_rejected', occurredAt: '2026-11-19T02:00:00.000Z', eventId: 'Preview only' },
} satisfies TemplateEntry
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '520px', margin: '0 auto' }
const brand = { color: '#e0447c', fontSize: '28px', margin: '0 0 16px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '14px', lineHeight: '22px' }