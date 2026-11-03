# Verify everyone appearing in creator content

## What changes
Only the uploading account must be a DTT creator. Other people appearing in content can either link an approved DTT creator identity or complete a private guest-performer review without a public profile. Being a customer, being an approved creator, or signing a release alone does not clear someone for a particular video.

### 1. Private participant records
- Add a PARTICIPANTS section beside creator identity verification, with pending, approved and declined statuses.
- Collect legal name, date of birth, aliases/stage names, country, qualifying government-ID evidence and a current holding photo. Guest evidence must come through a limited, expiring invitation with private submission; creators cannot approve guests or impersonate their consent.
- Keep public names separate from private identity details. Creators see invitation/review status, not guests' ID images. Authorized administrators review private evidence and record decisions with reasons; no self-approval.
- Link existing verified creators through an invitation they accept; never allow a creator to enroll someone else by entering a username alone.

### 2. Records for each video or photo
- Require a participant list including the uploader, the recording date, title/reference and confirmation that everyone appearing is listed. Face concealment does not remove the requirement.
- Check each participant was at least 18 on the recording date, not merely 18 today. Dates must be valid and not in the future.
- Collect signed permission tied to the exact content and its intended DTT uses: teaser, paid library, portrait or custom delivery. Include who can distribute it and the applicable rights; do not assume the uploader owns third-party footage.
- Provide a printable draft release for the participant to sign, alongside a private direct-consent submission. Clearly mark the draft as needing qualified legal review, not a certified legal form.
- Older videos require original production-age/identity records and distribution permission. A new selfie or today's ID alone does not prove age or required ID checks at production. Missing records keep that content unavailable.

### 3. Administrator clearance
- Extend the protected verification area with country/name/status filters and separate participant and content queues.
- Review the actual content against its participant list, identity evidence, recording-age evidence and permission records. Record approval or decline, reviewer, time and reason; keep an audit history.
- Approval requires separate confirmations for identity, adult age at recording, complete participant list and distribution consent. No client-side checkbox grants publishing rights.
- Support an administrator hold for disputed consent or suspected missing participants; immediately deny new playback links while retaining evidence and customer media. Existing downloaded files or already-issued links cannot be recalled instantly.

### 4. Protect every content path
- Uploads remain privately staged until cleared. Only approved content can appear in teaser discovery, paid libraries, profile photos/videos, creator-uploaded backdrops or request deliveries.
- Enforce clearance on the server for registration, activation, access and signing, including permanent buyouts. Preserve uploader identity approval, ownership, watermarking, payment, expiry and retention safeguards.
- Every existing item starts as **Needs participant review**, not automatically approved. This temporarily hides existing uncleared teasers and other media from customers; administrators retain private review access. Do not delete files or silently change paid access periods.
- Exclude uncleared items from available-library counts so customers are not charged for a library with no cleared content. Do not change token pricing, revenue splits or payment-provider settings.

## Checks
- Add tests for guest/account ownership, invitation expiry/reuse, denied direct approvals, private document access, underage-at-recording rejection, invalid dates, missing participants, wrong-content consent, declined/held evidence and legacy-media holds.
- Test all teaser/library/portrait/backdrop/request/permanent-content access paths, including direct requests that bypass the screens.
- Check creator and administrator screens, invitation submission, translated labels, error states and narrow-screen fit in a browser.
- Never fabricate real identity evidence or approve a real person to test. A genuine identity-to-review-to-publishing walkthrough requires a willing adult's authentic documents and the owner's human review; report that check as pending if unavailable.

## Technical approach
- Add private participant, invitation, versioned content-manifest, consent and review-event records with explicit grants and account-scoped policies. Store identity/release documents separately from customer media and public profile records.
- Use authenticated role checks for creator/admin operations and securely generated, hashed, expiring invitation tokens for limited guest submission. Tokens grant neither dashboard nor media access and are excluded from logs.
- Bind clearance to the immutable stored content version; replacements invalidate clearance. Server helpers enforce the same predicate across database reads and all media-signing functions, including service-role signing paths.
- Use bounded, paginated review queues and short-lived private document previews; preserve records against ordinary user deletion. Document the new shared enforcement rule in project architecture guidance.

## Limits before launch
These safeguards reduce risk; they do not guarantee legal compliance, detect every concealed participant automatically, or establish TryBit/CCBill approval. Qualified counsel must confirm applicable 18 U.S.C. §§ 2257/2257A, 28 CFR Part 75, release wording, production-record requirements, custody/retention, disclosures and country-specific rules. Payment settings stay unchanged. No publication is included.