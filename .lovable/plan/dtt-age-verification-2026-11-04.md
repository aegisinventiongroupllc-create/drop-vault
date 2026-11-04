# DTT Age Verification

## Your chosen approach
Creators use a DTT-branded verification experience. A specialist checks their ID, age, face match and liveness; you see the results and make the final approval decision. A specialist pass alone never publishes a creator or unlocks their content.

## Build in this order
1. **Guided DTT verification:** turn the existing verification form into clear steps for document details, ID front/back, holding-ID photo, specialist check and submission review. Preserve the existing private storage, camera and language selector.
2. **Connect specialist checks:** extend the existing Yoti test integration if an accepted live Identity Verification account is available. Confirm document authenticity, date-of-birth extraction, expiration, face comparison and liveness support before enabling it. Preserve necessary provider disclosures; DTT branding does not imply DTT built the specialist technology.
3. **Private review queue:** show specialist results separately from creator-entered details, with pending, needs-review and failed states. Show “not checked” where no result exists; never invent confidence scores. Retain private evidence previews and logged administrator decisions.
4. **Your final approval:** require a successful supported live check and your documented review for this specialist-assisted path. Failed, incomplete or test checks cannot grant approval. Keep the existing manual-review path distinctly labeled while the specialist is not connected; do not relabel past manual approvals as specialist-verified.
5. **Test:** cover under-18, expired/unreadable documents, failed or missing face/liveness checks, ownership, forged results and test-mode results. Check desktop/mobile capture, retry and review states. Test genuine end-to-end checks only with a consenting adult and your review.

## Setup needed from you
- A specialist Identity Verification account accepted for DTT’s actual business, with its live credentials supplied through a secure form.
- Agreement to that provider’s actual pricing and data-processing terms before paid checks run. No purchase or paid check is authorized by this plan.
- Genuine consenting adult evidence for the final walkthrough; no fake documents or testing approvals on real accounts.

## Technical safeguards
- Reuse private `creator-2257-records`, immutable review events and administrator-only decision functions; do not create duplicate ID vaults.
- Bind specialist sessions and results to the authenticated account and submission. Retrieve results server-side; client redirects, scores and browser storage cannot authorize approval.
- Store the minimum necessary specialist results privately; do not expose legal names, DOB or document details through public profiles or logs.
- Preserve content-specific participant clearance and payment approval requirements. ID approval is not complete §2257 compliance or payment-provider approval.

## Outcome and limits
DTT gets its own guided verification and owner-review experience, with real specialist checks once connected. This is not a from-scratch replacement for Yoti’s independently tested biometric technology. Nothing will be published without your request.