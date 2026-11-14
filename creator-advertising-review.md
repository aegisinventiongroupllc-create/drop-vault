# DTT creator advertising readiness — review completed 14 November 2026 UTC

Requested 12 November; evidence gathered across 13–14 November UTC. Independent TryBit-style application review, not a TryBit employee decision, legal certification or penetration-test guarantee. Shaped by the campaign-readiness assessment workflow. No site changes, publication, advertising, identity approval or money movement authorized or performed.

## Verdict: HOLD broad paid creator recruitment

The application has substantial implemented safeguards, but is not demonstrated launch-ready. Resume Lovable Cloud first: it was healthy during initial checks and later explicitly reported paused. Signup, authentication and server-dependent activity cannot be verified or offered reliably while paused. Earlier successful probes do not establish current availability.

Small, clearly disclosed invitations for private preparation are a different proposition from advertising a fully operating paid marketplace. They still require a working signup and accurate promises. Do not spend or promise completed payout/verification services on this review alone.

## What actually passed

- Full existing automated suite: **568 tests in 90 files passed**. Includes isolated deployed-database fixtures for payment permissions, prices, receipt matching, duplicate handling, VIP reservations/last slot, clearance, withdrawals, escrow, renewals, and private access. These are not genuine funded transactions or concurrent production stress.
- Public https://dropthatthing.com returned HTTP 200. Live and preview entrance inspected at 384×629; intro dismisses, one explicit adult warning and three consent controls remain. No page errors observed on these entrance checks. No agreements accepted on someone else's behalf.
- Restored available session on localhost; pricing displayed $20/year entry and 1/5/10 tokens for $25/$120/$230. Persona test page displayed sandbox warning. Private review page denied the non-administrator. Ordinary signed-in home still stopped at consent; full dashboard journey was not exercised.
- All **11 current storage buckets reported private**, including ID, participant, draft, teaser, vault and request-delivery storage. Private buckets alone do not prove every authorization path safe.
- Credit-token, credit-entry, verified-VIP-grant, request-paid and VIP-reservation functions denied direct anonymous/member execution in the live permissions snapshot. Account-authenticated unlock remains callable, as expected.
- Initial infrastructure snapshot: database/pool up, 62% memory, 12% data disk, 17/60 connections, no recent exhaustion alert. Historical rollback count is not an outage measure. **Later paused status supersedes this snapshot.**
- Initial deployed TryBit availability probe returned enabled:true. That proves local checkout readiness conditions are enabled, not TryBit merchant approval, provider mode, invoice success or settlement.

## Required before advertising an operating marketplace

| Area | Status | Evidence and smallest next action |
|---|---|---|
| Availability | BLOCKED | Cloud reported paused; subsequent queries/calls failed. Owner resumes it; then repeat public signup/sign-in and server checks. No automatic resumption or spending was performed. |
| Truthful creator earnings | BLOCKED | Current About source says 91–95%, but standard agreement pays 90%. About describes Elite as 92%, and Power Week as 95%; agreement instead says Elite 93% and Power Week 92%. Reconcile all public, agreement, checkout and translated claims to actual implemented rules before using them in ads. |
| Annual 95/5 award | BLOCKED for promising it as available | Latest owner decision permits the claim and plans annual male/female country awards, but award automation is documented not built. Implement and test eligibility/award rules or clearly distinguish planned eligibility from current earnings; do not assume the award exists. |
| Checkout descriptions | BLOCKED | About still says live checkout disabled, custom-request payment unavailable and VIP Coming soon, while TryBit probe enabled and VIP checkout implementation exists. Audit actual live version, then align descriptions. No public-page edits were made in this review. |
| Private-data access | BLOCKED pending fixes/recheck | Completed deep scan found comment-author lookup exposing private commenter IDs to signed-in callers and creator-split lookup exposing another creator's revenue terms. Review current deployed definitions, scope/revoke inappropriate calls, add cross-account regression tests and rescan. Live definition confirmation failed after Cloud paused; these remain unresolved scanner findings, not newly reproduced attacks. |
| Dependency security | BLOCKED pending assessment/update | Production dependency scanner reported a high-severity zod 3.25.76 oversized-collection memory-exhaustion advisory, fixed in 4.6.6. Verify affected usage, upgrade compatibly, rerun tests and dependency scan. Major-version update may require code changes; no automatic upgrade made. |
| Genuine creator onboarding | UNKNOWN / launch evidence missing | Initial data: 2 approved verification records, 1 media record, **0 approved content manifests and 0 performer-index rows**. Demonstrate signup/email confirmation → agreement → genuine ID submission → owner's human approval → permanent branded upload → participant/content review → authorized discovery/playback. Existing approval records do not establish successful current submission or content clearance. |
| Persona | UNKNOWN / sandbox only | Source and browser show sandbox-only checks; it never approves creator/content access. Previous test failed because template was not deployed to Sandbox. Current unauthenticated status call was denied; hosted start/completion was not retested. Deploy/test sandbox template, confirm Persona accepts the actual adult marketplace, then decide and configure production usage and private-data notice if required. Manual review remains current approval path. |
| TryBit merchant acceptance | UNKNOWN | Local enabled flags were turned on for requested review testing. No written final approval, hosted provider mode, approved ticket caps, actual fee schedule or supported test method verified. Obtain TryBit's confirmation for DTT Media LLC, adult marketplace model, domain, creator payments and $1,500/$3,500 VIP products. Do not treat the flags as approval. |
| Payment completion | UNKNOWN / mandatory operational evidence | Initial verified receipt counts: entry 0, tokens 0, requests 0, VIP 0. Use owner-authorized provider testing: $20 entry, token bundle, accepted request, Pro and Elite. Verify actual invoice/payment → provider-confirmed receipt → account update/reload → ledger. Test unpaid, wrong amount/currency/order/account, duplicate notice, abandoned checkout and delayed confirmation. Do not pay $1,500/$3,500 merely for this audit. |
| VIP 1,000-pass handling | Implementation/tests READY; real checkout UNKNOWN | Tests cover shared limit, last slot, retries, expiry, grants and permissions; sold count initially 0. Earlier browser sold-out/owned states used simulated responses. Run simultaneous last-slot and delayed-payment reconciliation in isolation, plus actual provider-confirmed creator purchase. Keep reservations that may still be payable; operationally resolve ambiguous invoices through support. |
| Customer age and geographic protection | BLOCKED for broad adult-content launch | Entry is self-affirmation. Country check is browser-side; direct signing/delivery is not comprehensively jurisdiction-protected. Establish trusted server and delivery location controls plus legally appropriate viewer age assurance, state/territory and sanctions handling. An 18+ checkbox, entry fee or creator ID does not verify viewer age. |
| Legal/record custody | BLOCKED pending qualified review | Custodian record exists, but its presence is not proof of inspection arrangements. Confirm applicable §2257/2257A records, valid custodian/inspection premises, per-content statements, retention, consent/withdrawal, consumer remedies, privacy/Persona notice and tax/crypto obligations. Do not assume the DMCA virtual-mail address is a lawful records-inspection facility; never publish a home address. |
| Media provider acceptance | UNKNOWN | Bunny delivery has prior synthetic signing tests; written acceptance of DTT adult UGC and real cleared creator-to-customer playback remain unverified. Confirm storage/streaming/backup contracts, private originals, token expiry and provider removal on withdrawal. |
| LTC payout operations | UNKNOWN | Completed creator payouts initially 0. Verify earned/escrow/available amounts, authentic creator wallet, network and fees, owner-approved small transfer, transaction evidence and ledger readback. Define payout schedule/support and reconciliation; no funds sent. |
| Recovery | BLOCKED for dependable paid launch | Backup verification rows initially 0; no documented successful isolated restore. Export database and separately preserve private media/evidence through approved secure tools; rehearse recovery without overwriting production. A database snapshot excludes stored files. |
| Translation quality | PARTIAL | Public saved catalogs and automated checks exist; populated private dashboards, recent VIP/revenue wording, provider pages and professionally reviewed legal wording remain unverified. Limit advertised markets to those actually reviewed, with owner agreement; do not silently exclude countries. |
| Recruitment destination and channel | UNKNOWN | No campaign brief, channel, budget, audience, dates, ad assets or approved destination supplied. Current homepage leads through intro and adult consent, not a direct demonstrated creator signup journey. Choose a permitted channel and test the exact creator destination; no new page or campaign created. |
| Ad measurement/consent | UNKNOWN / not installed by this audit | No agreed conversion outcome, provider definition or receipt evidence established. Choose whether success means visits, creator signup or approved creator. If tracking is wanted, check provider eligibility for sensitive adult-site signals, consent, opt-outs and privacy notice first. Do not send IDs, selfies, sexual interests or private payment terms to ad platforms. |
| Scale and operational support | UNKNOWN | Low-traffic health is not capacity evidence. Confirm monthly budget/quotas, support escalation, moderation/illegal-content reporting, manual review capacity and an isolated low-volume-to-load test. No million-simultaneous-user claim supported. |

## Other review details

- Basic database security scan reported no new active findings; previously owner-dismissed findings were not reopened or changed. This does not override the new deep-scan warnings.
- Database linter returned 102 flags: 17 service-only/no-policy tables, 1 definer view, 4 mutable-search-path functions, 1 public extension, 23 anonymous-callable and 56 member-callable definer functions. Many are intentional or trigger-only, so these are not 102 proven vulnerabilities. The public_profiles view projects limited public fields and excludes unapproved creators in the inspected definition. Triage genuine exposures rather than disabling legitimate functions indiscriminately.
- Later unsigned-webhook and invalid-session VIP probes could not reach the paused service; **do not count them as successful denials**. Existing automated authorization tests passed.
- Hosting-plan approval, current hosted auth/signup settings, completed Google chooser return, delivered confirmation/recovery emails, support mailbox delivery and successful normal protected owner-admin login were not verified.
- Historical roadmap reports are dated evidence, not current readiness. Older Yoti-only requirements, founder splits, deadlines, disabled-checkout and missing-Bunny/VIP statements have been superseded in parts. Do not use that mixed roadmap as marketing copy.
- Access stacking matches explicit later owner approvals in chat history; the older no-stacking memory warning is contradicted by those messages. No access-rule change proposed or made here.

## TryBit-style review standard and advertising policy

TryBit's official checklist asks for own-domain/paid hosting, a functional site/login/dashboard/payment flow, real products with clear pricing, no incomplete/test product offerings, working support and accessible policies. DTT's domain and documents are present, but current service pause, stale descriptions and missing funded/cleared-content demonstrations prevent a confident submission. Adult services are described among supported niches; this is not individual merchant approval.

Sources consulted:
- https://support.trybit.com/general-information/connection-requirements
- https://support.trybit.com/general-information/about-trybit
- https://support.trybit.com/getting-started/add-project

Google prohibits sexually explicit ads and destinations, while other sexual content is strongly market/placement restricted. Meta prohibits nudity/sexual activity and, in this policy, logos/screenshots/video of known pornographic websites. Clean creator-recruitment copy does not automatically make an adult destination eligible. Obtain channel-specific policy acceptance for the actual destination; do not hide the business or cloak pages.
- https://support.google.com/adspolicy/answer/16490050?hl=en
- https://support.google.com/adspolicy/answer/6023699?hl=en
- https://transparency.meta.com/policies/ad-standards/objectionable-content/adult-nudity-and-sexual-activity/

No selected provider campaign/account/billing setup exists in this assessment, so account configuration, targeting and attribution remain unknown; campaign creation requirements are not assumed satisfied.

## Smallest next sequence

1. Resume Cloud and repeat server availability, signup/login, private authorization checks.
2. Authorize targeted fixes for two privacy warnings, dependency advisory and inconsistent creator/payment descriptions; test and recheck.
3. Have genuine creator and owner-admin sessions complete ID/content approval and normal upload/playback without bypasses. Finish Persona separately if it is intended for launch.
4. Confirm TryBit's approved test process and execute authorized small payments, provider confirmation and LTC payout; validate VIP large tickets without spending large amounts unnecessarily.
5. Complete jurisdiction/age/legal/custody/provider-contract review and isolated backup recovery. Review launch languages and moderation/support operations.
6. Select permitted recruitment channel, exact destination and truthful offer; configure measurement only if separately authorized, publish requested fixes and verify live before approving a modest advertising launch.

No fully populated transaction journey, genuine ID approval, live withdrawal or payout was completed in this review. Every unverified item above remains explicit. The review deliverable is complete; remediation and blocked operational tests are not.