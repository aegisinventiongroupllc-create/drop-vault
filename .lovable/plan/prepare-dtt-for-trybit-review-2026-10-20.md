# Prepare DTT for TryBit review

## Goal
Finish the app work that can be completed now, then identify the remaining owner/provider requirements clearly. Leave TryBit’s test-mode toggle unchanged. No advertising, purchases, paid upgrades or verification bypasses.

## 1. Accurate payment and policy pages
- Correct unsupported claims about active payments, licensed processors, automatic wallet/sanctions screening and guaranteed country enforcement.
- Align all displayed prices and creator earnings with the established DTT rules, including the separate processing fee and manual LTC payouts.
- Keep unavailable payment methods clearly unavailable; only verified approved connections may offer live checkout.
- Preserve the refund exceptions and Pennsylvania ownership/law; do not invent business-address or DMCA registration details.

## 2. Complete the offered-language experience
- Inventory missing phrases across entry/sign-in, dashboards, creator pages, Top 10 fans, requests, payment and legal pages.
- Expand reusable saved translations so repeated page views do not require paid AI translation.
- Keep names and private messages unchanged; use tasteful social wording and precise payment/safety wording.
- Verify each offered language’s populated flows where eligible accounts exist. Legal translations remain subject to qualified review.

## 3. Media and customer/creator workflows
- Test the existing private-media authorization, permanent watermarking, upload recovery and access-expiry protections.
- Exercise upload, viewing, teaser gating, messaging, requests, delivery and renewal with eligible accounts; fix reproducible app failures.
- Do not grant unpaid access, simulate successful purchases, or approve unverified creators to make a demonstration appear complete.
- Identify and correct missing payment steps only against an approved provider specification and secure test connection; test receipts must never credit production access or earnings.

## 4. Final verification and launch gates
- Run relevant automated checks and a fresh security scan; review findings before making any security changes.
- Check the real published pages against prepared changes only after an explicit publishing request.
- Document media limits and recovery requirements. No high-volume production tests; millions of simultaneous users remain unproven.
- Provide a final checklist separating completed app work, unverified flows and external blockers.

## Owner/provider requirements that cannot be supplied by code
- Business mailing address and confirmed DMCA agent registration details—never a home address on the site.
- Live Yoti setup and a genuinely verified/approved creator with eligible sample media.
- TryBit’s actual approval instructions, secure integration details and successful test-payment confirmation; final approval before real payments or advertising.
- Approved media delivery/backup service, verified quotas, spending limit and an isolated recovery/load-test environment.
- Owner-performed real purchase and payout checks after payment approval.

## Technical approach
Retain the existing React app and Lovable Cloud protections. Reuse the shared translation catalogs, media encoder/access helpers and payment receipt authorization. Keep test transactions isolated from production balances and enforce payment readiness on the server as well as the visible controls. Add focused rule tests alongside existing tests, then verify real eligible flows through the app.

## Current evidence
The published consent screen and four policy windows opened, consent led to sign-in without page errors, and 51 focused tests passed. Both named reviewer profiles exist, but complete paid/verified journeys are not established. The latest available security results are stale, not proof of current launch safety. The supplied screenshot shows Gmail’s AI summary, not the expanded TryBit approval message.