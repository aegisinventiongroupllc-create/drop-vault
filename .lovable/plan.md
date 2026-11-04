# DTT launch preparation: ordered execution

## Decisions already confirmed
- Allow strictly private creator drafts before approval, replacing the former rule that blocked all content uploads.
- Use DTT's in-house ID-review workflow. The owner makes the final approval decision; do not automatically approve based on OCR or an 85% face score.
- Keep existing payment, participant-clearance and customer-access protections. Do not publish or change TryBit test/live mode without a separate request.

## Completed today
- Audited existing creator verification, participant clearance, customer consent, country gate, branding and relevant official service documentation.
- Set the static title to **Drop That Thing**, with matching descriptions, Open Graph site name/title and Twitter title. Updated the installed app name.
- Confirmed the favicon, Apple icon and installed-app artwork use the gold DTT logo; switched to the existing DTT PNG favicon and removed the obsolete ICO.
- Hosting's Lovable badge is already hidden. Source audit found no visible staging links in headers, footers or help. Preview checks returned the correct metadata and all active icons successfully, with no visible Lovable badge or staging anchors. Build is clean.
- Necessary internal sign-in, preview and AI service addresses remain; removing those would break services, not improve public branding.

## Important corrections to the supplied brief
- Crypto payment finality does not remove legal refund duties, fraud, sanctions, wallet compromise, disputes or business liability. Do not advertise DTT as risk-free or guarantee profitability.
- Describe the real arrangement: DTT Media LLC operates a creator marketplace, collects payments under its actual merchant arrangement and pays creators in LTC. Do not call it peer-to-peer SaaS unless its actual contracts and money flow support that description.
- TryBit alone decides approval. A working ID dashboard cannot guarantee immediate live keys. Obtain its current adult-content, onboarding and payout requirements in writing.
- A checkbox or encrypted browser flag is consent, not age verification. Browser-held encryption cannot make a user-written flag trustworthy.
- Identity approval is not the whole of 18 U.S.C. §2257 recordkeeping. Recording-age evidence, aliases, content cross-references, custody, retention and applicable record-location/labeling duties require qualified legal review. Never publish a home address.
- Bunny Stream and Bunny Storage are separate products. Stream's documented direct-upload method is expiring TUS authorization generated on the server; ordinary Storage uploads use a zone credential, not the proposed generic presigned-URL flow.
- MediaCage and expiring playback help deter copying; neither prevents every recording or redistribution.

## Execute in this order

### 1. Finish the existing private ID workflow first
Enhance the current creator VERIFY/onboarding section and `/admin/verifications`, rather than adding duplicate systems.
- Require ID front, ID back and a holding-ID selfie, plus legal name and DOB.
- Add an in-page camera option. Clearly distinguish a recorded photo from a certified biometric liveness check.
- Add document expiry, document type/issuing country and relevant record identifiers for human review; do not invent OCR results or face-confidence scores.
- Require confirmed adult age, readable valid evidence and explicit human confirmation for approval. Unclear or expired evidence goes to a flagged queue; underage evidence cannot be approved.
- Show side-by-side private evidence, review notes and country/name filters. Decisions remain authenticated administrator actions with immutable timestamps and actor records.
- Synchronize approved status and verified badge only through trusted review actions; creators cannot edit their own approval.
- Add a protected, deliberate audit export with access logging and content/participant cross-references. It is a record export, not a certificate of §2257 compliance.
- Use one canonical private identity vault, retaining existing evidence paths without public access or an unnecessary duplicate copy. Consolidate the conflicting requested bucket names into `creator-2257-records` for new evidence while supporting legacy records securely.

**Verification:** test exact age-18 boundaries, missing back image, expired/unclear documents, underage rejection, non-admin denial, owner isolation, immutable decisions and approval synchronization. Real document review needs authentic adult evidence and your approval; do not fabricate IDs.

### 2. Add isolated private drafts before changing normal upload gates
- Create a separate owner/admin-only draft workspace for pending, flagged and unsubmitted creators. Rejected or underage accounts cannot upload drafts.
- Profile photos, teasers and full videos remain unpublished; draft uploads cannot enter discovery, portraits, library counts, paid offers or customer playback.
- Preserve permanent creator-media watermarking before storage. Identity documents are never watermarked.
- Show the requested pending-verification banner and disable publishing actions. Do not invent token-price or Go Live controls where DTT's existing fixed-token model has none.
- Refresh review status and offer **Publish My Content Live** after approval. Approval unlocks a request to publish, not automatic publication: each item still needs participant and recording-age clearance.
- Preserve owned permanent purchases and paid request deliveries; do not migrate or delete customer media as part of draft setup.

**Verification:** direct unauthorized requests, cross-account access, rejected-user attempts, unpublished discovery exclusion, post-approval publication with and without clearance, cleanup and reload persistence. Keep current upload restrictions until the replacement is tested.

### 3. Connect Bunny Stream for new draft videos
**Your next action:** open the Bunny Stream library setup screen and share it with keys hidden. Written adult-content acceptance has already been supplied; confirm it covers DTT's intended creator uploads and private paid delivery.
- Set up a Stream library, encoding choices and appropriate regions. Do not create a separate Storage zone merely to "link" raw uploads into Stream.
- Save credentials through a secure connection form, never chat or frontend code. Confirm a monthly spending ceiling before enabling paid storage, replication or encoding options.
- Add server-authorized expiring TUS uploads for eligible private drafts, bounded file limits and resumable progress.
- Bind provider video IDs to the authenticated owner. Verify authenticated provider events before changing encoding state; encoding completion never publishes content by itself.
- Issue short-lived playback authorization only after account, payment and content-clearance checks. Validate the chosen player/security setup against Bunny's documented MediaCage limitations.
- Keep private photos on existing storage initially. Add Bunny Storage separately only if needed, with a safe documented upload approach; never hand its zone password to a browser.

**Verification:** authentic eligible sample upload, interruption/resume, encoding completion, owner preview, customer denial, approved paid playback and access expiry. No live content migration or capacity claim until these pass.

### 4. Strengthen customer consent and age assurance
- Keep one non-dismissible translated age/Terms entry gate, adding the requested age-of-majority notice and under-18 exit. Preserve required existing consent rather than silently replacing it with one checkbox.
- Implement a 30-day signed consent receipt checked server-side, with policy version, method, timestamp and minimally necessary trusted-IP audit details. A receipt records affirmation; it is not an age-verification badge.
- Require the requested certification during registration and a fresh age affirmation before crypto checkout. Persist consent successfully before issuing checkout; do not silently continue after audit-write failure.
- Pass only documented, necessary CCBill fields after confirming its accepted interface; do not invent a DOB flag or expose a customer's full DOB unnecessarily. Payments remain unavailable until provider approval and verified checkout requirements are met.
- Add trusted server-side country/state checks and an admin-only customer assurance/revocation queue. Recheck access when issuing media links; a revoked check cannot authorize new links.
- Build jurisdiction requirements from a maintained, legally reviewed policy, not the five-state example list. Until trusted location and an accepted customer age-assurance method are configured, affected/unknown access must remain blocked rather than receive a fabricated verification result.

**Blocker:** DTT's manual creator-ID review is not an automated customer age-assurance service. No such provider account or legally approved jurisdiction policy has been supplied. Do not claim those states are compliant from the browser country gate.

### 5. Prepare TryBit's review package
- Verify reviewer login and authorized entry access, without weakening normal customer payment rules.
- Assemble screenshots of age/Terms/refund notices, real private human ID review, participant clearance, private drafts and approved playback.
- Use accurate DTT Media LLC contact, merchant and LTC payout details. Refund language must preserve non-waivable rights, not promise that blockchain finality eliminates refunds.
- Ask TryBit to confirm adult-content acceptance, creator verification/payout obligations, sandbox test procedure, fees and live-review prerequisites.
- Do not submit false approved-creator evidence, claim Bunny capacity tests that were not run, or switch to live processing merely because keys exist.

### 6. Test, then publish only when requested
- Run focused authorization/business-rule tests and desktop/mobile walkthroughs with genuine eligible evidence.
- Verify creator submission → human review → private upload → clearance → publication, and customer affirmation → required age assurance → verified payment → authorized playback.
- Record every unverified external step honestly. Run security checks for changed access paths.
- Owner submits the TryBit review after the evidence is ready. Live approval, fees, real payment testing and publication remain separate decisions.

## Technical approach
- Additive database changes only, explicit grants and row-level policies; retain protected role checks and existing review history.
- Server functions validate sessions, roles, object ownership, evidence state and all inputs. New provider credentials stay server-only.
- Reuse current review and participant modules; keep draft authorization separate from public media authorization so unverified objects cannot leak through sibling paths.
- Keep operational content records distinct from creator identity status and customer consent/assurance records.
- No external OCR/face API is connected under the confirmed in-house approach. If automated assistance is added later, obtain vendor/biometric privacy approval first; it remains advisory and human-reviewed.

## What can and cannot finish today
We can implement and test the in-house review improvements, private-draft safeguards and consent/audit foundations after approval of this plan. Bunny connection requires your library setup and secure credentials; trusted regional age assurance needs an accepted service/policy. Real identity/content tests need genuine evidence. Counsel, Bunny and TryBit approval cannot be supplied or guaranteed by code, and no paid upgrades, funds transfer or publication are authorized here.