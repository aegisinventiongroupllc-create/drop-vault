import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SIGNUP_OWNER } from '../signupProgress.ts'
const Email = ({ email, accountType, status, next, observedAt }: { email?: string; accountType?: string; status?: string; next?: string; observedAt?: string }) => (
  <Html lang="en"><Head /><Preview>{status ?? 'DTT signup progress'}</Preview><Body style={main}><Container style={container}>
    <Heading style={brand}>DTT</Heading><Heading style={heading}>{status ?? 'Signup update'}</Heading>
    <Text style={text}>Account email: {email ?? 'See your administrator dashboard'}<br />Account type: {accountType ?? 'Not selected'}<br />Observed (UTC): {observedAt ?? 'Not available'}</Text>
    <Text style={text}>{next ?? 'Check this account in your administrator dashboard.'}</Text>
    <Text style={text}>Only the listed milestone is confirmed. Closing the page or failing before an account exists cannot reliably be detected or linked to a person. Passwords, identity documents and private media are never included.</Text>
    <Button href="https://dropthatthing.com/admin-portal" style={button}>OPEN ADMIN DASHBOARD</Button>
  </Container></Body></Html>
)
export const template = { component: Email, to: SIGNUP_OWNER, subject: (data: Record<string, string>) => `DTT signup: ${data.status ?? 'progress update'}`, displayName: 'Signup progress and help', previewData: { email: 'member@example.test', accountType: 'customer', status: 'Customer joined the waiting list successfully' } } satisfies TemplateEntry
const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '520px', margin: '0 auto' }
const brand = { color: '#e0447c', fontSize: '28px' }
const heading = { color: '#111111', fontSize: '22px' }
const text = { color: '#333333', fontSize: '14px', lineHeight: '22px' }
const button = { backgroundColor: '#e0447c', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none' }