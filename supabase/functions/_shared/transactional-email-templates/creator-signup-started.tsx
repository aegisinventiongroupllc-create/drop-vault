import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { CREATOR_SIGNUP_RECIPIENT } from '../creatorSignupNotification.ts'

const Email = ({ email, startedAt }: { email?: string; startedAt?: string }) => (
  <Html lang="en" dir="ltr"><Head /><Preview>A creator has started setting up their DTT account</Preview>
    <Body style={main}><Container style={container}>
      <Heading style={brand}>DTT</Heading><Heading style={heading}>A creator is getting started</Heading>
      <Text style={text}>{email?.startsWith('agent-test+') ? 'TEST: a temporary automated-check account has started onboarding. This is not a real creator signup.' : 'A creator account has started onboarding.'}</Text>
      <Text style={text}>Account email: {email ?? 'See your private administrator dashboard'}<br />Account created (UTC): {startedAt ?? 'See your dashboard'}</Text>
      <Text style={text}>This is a signup notice, not an identity approval. Email confirmation, creator setup, adult identity review and content-specific consent may still be incomplete. No documents or private media are attached.</Text>
      <Button href="https://dropthatthing.com/admin-portal" style={button}>OPEN ADMIN DASHBOARD</Button>
    </Container></Body>
  </Html>
)
export const template = { component: Email, subject: 'DTT: a creator has started signing up', displayName: 'Creator signup started', to: CREATOR_SIGNUP_RECIPIENT, previewData: { email: 'creator@example.test', startedAt: '2026-11-21T23:10:00Z' } } satisfies TemplateEntry
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '520px', margin: '0 auto' }
const brand = { color: '#e0447c', fontSize: '28px', margin: '0 0 16px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '14px', lineHeight: '22px' }
const button = { backgroundColor: '#e0447c', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none' }