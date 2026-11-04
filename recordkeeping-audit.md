# DTT recordkeeping audit — November 4, 2026

This is a technical inventory, not a legal compliance certification. No real identities were reviewed or approved, no payment processor was enabled, and no content was published.

## Existing records and safeguards
- Creator submissions: legal name, DOB, ID front/back, holding selfie, document type/number/issuing country/expiry, account and country, submission and review dates, reviewer identity, decision and notes. Older submissions may lack newer document details.
- Guest participants: legal name, DOB, aliases, country, ID/holding-photo paths, optional linked creator identity, reviewer and decision. Guests do not need public creator accounts.
- Content: title, internal identifier, recording date, exact storage object version, uploader/participant references, original-production evidence and uploader distribution-rights evidence, completeness declaration and separate review confirmations.
- Guest permission: exact accepted text, signer name, signed release path, acceptance timestamp and revocation field, tied to one content manifest and participant.
- Private administrator review, short-lived evidence links, private identity and participant storage, owner-only private drafts, and server-enforced identity/content approval checks.
- Identity audit exports are page-level, not complete archival packages; event/content references have a 1,000-row cap. Storage objects are not included in database exports.

## Scoped improvements applied
- Referenced creator ID files in all three existing identity buckets resist authenticated-client deletion and replacement. Unattached upload cleanup remains possible where existing policies allow it.
- Content decision history resists UPDATE/DELETE, including ordinary service-role writes; signed guest consent details resist alteration/deletion. A first withdrawal can still be recorded, but cannot later be erased or rewritten.
- Participant/content evidence opening is logged before links are issued. Uploader and linked-creator previews include ID backs when available. Guest consent text, signing time and withdrawal status are visible in content review.
- Canonical § 2257 wording no longer assumes that being a technology platform removes DTT's possible producer obligations.

These protections are not a storage-provider object lock. Privileged maintenance, database owners, bucket deletion, migrations, account deletion/cascades and disaster recovery require separate controls. No deletion timetable was invented.

## Missing fields and indexing
- Creator legal/stage/maiden/other-name history is not a dedicated immutable, searchable records index. Guest aliases are free text, not a full cross-index.
- Guest ID metadata is not structured like creator document metadata (type, number, issuer, expiry). Legible document copies remain essential; structured extraction alone is insufficient.
- Content references do not yet preserve publication URLs, publication dates, complete depiction/copy references or original-producer identity/address and source-record custody details where applicable.
- Identity approval may use latest account evidence rather than a permanent identity-evidence snapshot attached to each production record. Content versioning uses object timestamps rather than preserved file digests/archived depictions.
- Draft-to-cleared-content promotion is not implemented. Identity approval does not publish drafts.

## Consent gaps
- No explicit consent wording version/digest; the exact accepted text is saved and is now protected against rewriting.
- Uploader permission is an uploaded rights document rather than a dedicated signed structured consent receipt.
- Withdrawal has a server field and clearance checks, but no complete participant withdrawal request/admin adjudication workflow.
- Invitation acceptance is not proof of document authenticity, liveness, genuine signature or informed permission. Partial submission failures and corrections need a transactional/recoverable evidence workflow.
- Release wording, distribution scope, compensation/rights and production evidence require qualified review. A release is not a substitute for age-at-production records.

## Retention, custody and recovery gaps
- No legally reviewed per-record retention deadline, last-amended lifecycle, closure/dissolution procedure or legal-hold/disposal workflow.
- No complete secured media-plus-record archive/export, rehearsed recovery, inspection retrieval workflow or documented custody handoff.
- Federal 28 CFR 75.4 generally specifies seven years from record creation or last amendment/addition, and separate five-year business-closure/dissolution obligations. Applicable overlapping periods and scope must be confirmed before an automated retention schedule is set; approval or access expiry is not a deletion date.
- No confirmed responsible custodian's name/title, qualifying physical business/inspection location, operating/inspection arrangements or content-level statement placement.
- The Pittsburgh DMCA address is not established as a § 2257 inspection location. Never substitute it or publish a home address.
- Counsel must determine DTT's and creators' primary/secondary producer responsibilities and any § 2257A applicability; independent-contractor labeling is not an exemption.

## Launch sequence and crypto-only option
1. Private preparation can continue under the existing adult consent, account and draft safeguards. This is not a paid/public-content launch or proof of jurisdiction compliance.
2. Confirm custody/retention/required production records and lawful customer access requirements with qualified counsel, including state/country age assurance. Browser age affirmation and the $20 fee are not identity verification or a media privacy boundary.
3. Supply Bunny Stream setup, credentials through a secure secret form, and a funded spending limit. Finish protected uploads/playback and approved draft promotion; rehearse eligible media/record backup and recovery.
4. Ask TryBit for a new review with truthful manual-review and crypto-only disclosures, working reviewer access, private-content safeguards and accurate policies. Written merchant approval for DTT's actual adult marketplace/LTC money flow is required; no guarantee of acceptance.
5. After approval, connect live credentials and verify receipt-authorized checkout, refunds/support, token/access accounting and manual LTC payouts end to end. Current readiness flags stay disabled until justified.
6. Launch paid/public content only after the above safeguards and applicable legal/operational requirements are met. CCBill need not be used for an exclusively approved crypto checkout; keep cards unavailable and add CCBill later after its separate approval and testing.

Bunny credentials alone do not complete this sequence. Crypto finality does not eliminate consumer remedies, fraud, sanctions, taxes, wallet risk or DTT's liability. Provider credentials alone are not live approval.

## Official references
- https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title18-section2257&num=0&edition=prelim
- https://www.ecfr.gov/current/title-28/chapter-I/part-75/section-75.2
- https://www.ecfr.gov/current/title-28/chapter-I/part-75/section-75.3
- https://www.ecfr.gov/current/title-28/chapter-I/part-75/section-75.4
- https://www.ecfr.gov/current/title-28/chapter-I/part-75/section-75.5
- https://www.ecfr.gov/current/title-28/chapter-I/part-75/section-75.6