import * as React from 'npm:react@18.3.1';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22';
import type { TemplateEntry } from './registry.ts';

const palette = { background: '#090009', surface: '#180711', pink: '#ff007f', foreground: '#ffffff', muted: '#d5c4d0' };
const Email = () => <Html lang="en"><Head /><Preview>Your DTT founding customer entry is ready</Preview>
  <Body style={{ backgroundColor: palette.background, fontFamily: 'Arial, sans-serif', color: palette.foreground }}>
    <Container style={{ backgroundColor: palette.surface, maxWidth: '520px', padding: '32px', border: `1px solid ${palette.pink}` }}>
      <Heading style={{ color: palette.pink }}>DTT™ · DROP THAT THING™</Heading>
      <Heading>Your front-row start is ready.</Heading>
      <Text>Thank you for joining DTT’s founding customer waiting list. Customer entry payments are now open.</Text>
      <Text>Your saved entry rate is $10 per year for life on your waiting-list account, including annual renewals. Each paid pass lasts 365 days. Creator libraries use separate Bit-Tokens.</Text>
      <Button href="https://dropthatthing.com/entry-pass-preview" style={{ backgroundColor: palette.pink, color: palette.foreground, padding: '16px 24px', borderRadius: '8px' }}>PAY NOW · $10 ANNUAL ENTRY</Button>
      <Text style={{ color: palette.muted }}>Sign in with the account that joined the list. This invitation is not an invoice or a charge; access starts only after verified payment. If payments are temporarily unavailable, please try again later.</Text>
      <Text style={{ color: palette.muted }}>DTT Media LLC · 18+ only · dropthatthingmedia@gmail.com</Text>
    </Container>
  </Body>
</Html>;
export const template = { component: Email, subject: 'DTT: your $10 founding entry is ready', displayName: 'Founding customer payment invitation' } satisfies TemplateEntry;