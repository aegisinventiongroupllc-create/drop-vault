# Manual creator verification

## Creator submission
- Reuse the existing verification flow with the exact banner **Identity Verification Required to Upload Content** while uploads are blocked.
- Collect full legal name, date of birth through a date picker, government-ID front, and a holding selfie with the requested handwritten note: “Drop That Thing”, today's date and username.
- Validate age and image type/size; save new documents privately in `identity-documents` under the creator's account folder. Preserve existing documents and review history.
- Submit as pending; prevent duplicate pending requests and allow corrected submissions after rejection.

## Dedicated administrator section
- Add `/admin/verifications` and a link from the admin dashboard.
- Require a signed-in account with the protected administrator role, verified on the server. A passcode or editable profile flag will not authorize ID access.
- Provide paginated pending/approved/declined records, country filters and name/username search, plus legal name, username, email, date of birth and accurately calculated age. Dates of birth are claimed information until the administrator checks the ID.
- Provide short-lived private document previews, green Approve and red Decline actions, and a decline-reason dialog.
- Record reviewer identity, decision time and reason; retain earlier submissions and decisions.

## Approval and uploads
- Replace the initial mandatory Yoti dependency with a **server-recorded manual adult-ID approval**, not an unrestricted bypass. Retain Yoti for future use without fabricating Yoti results.
- Approval must require a creator account, age 18+, valid owned document records and explicit reviewer confirmation that ID, face and handwritten note match.
- Synchronize the profile's verification state atomically; creators cannot set their own approval or administrator privileges.
- Apply the same eligibility rule to profile photos, teasers, library media and request deliveries. Pending, declined and unauthorized accounts remain blocked; watermarking remains mandatory.
- Refresh the creator's status promptly after a decision. Existing Creator Agreement and other applicable account restrictions remain in place.

## Notifications
- Send approval/decline emails through the existing verified DTT email setup, including the correction reason for declined submissions.
- Keep the decision and reason visible in the creator dashboard even if email delivery fails; show any sending failure honestly.

## Technical details
- Extend existing verification tables and server functions rather than create a parallel identity system. Use the existing protected `user_roles` administrator role rather than user-editable `is_admin`.
- Protect profile verification fields from client writes; retain private storage ownership and record-bound signing, bounded queries, input validation and atomic decision handling.
- Keep legacy document access compatible without moving or deleting existing ID files.
- Update creator-facing claims affected by the verification change so manual checks are not presented as Yoti liveness checks.

## Verification and boundaries
- Test exact 18th-birthday eligibility, underage rejection, owner-folder validation, non-admin denial, self-approval denial, repeated decisions, rejected resubmissions and upload permissions across all creator media types.
- Exercise submission → admin preview → approve/decline → creator status → upload eligibility in the browser using isolated test records; never approve real people or fabricate real identity evidence for testing.
- No publishing, live payment enablement or provider-setting changes in this task.
- Manual checks do not prove document authenticity/liveness automatically or guarantee TryBit/CCBill approval or legal compliance. Provider acceptance and qualified review remain separate launch requirements.