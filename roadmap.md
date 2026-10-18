# Roadmap

## Current request
- [x] Secure entry-pass granting with server-only authorization and matching verified receipts; crypto confirmation retrieves merchant invoice data tied to the server-created checkout. All 34 tests pass, deployed payment handlers, and live anonymous/signed-in grant calls and unsigned notices are denied. Database business-rule tests use temporary tables and the deployed function body without changing real access. Real paid-provider confirmation remains unverified; invoices created before this fix lack receipts and fail closed.
- [x] Default to the third Star cluster photograph and enable personal photo tint through the shared circular galaxy color wheel; slow drift retained. Browser verified loaded photo, color blending and device-local persistence after reload; cross-device account saving retains the existing profile limitation.
- [x] Add personal globe tone wheel and gentle multicolor neon sparkles to the shared customer/creator color controls; shooting stars unchanged. Signed-in creator wheel, green globe, neon and reload verified; six tests pass. Account updates reject this existing profile's display-name format, so account-scoped local fallback preserves choices on this device; cross-device sync remains blocked for that profile.
- [x] Audit personal-data RLS and tighten creator-profile-photo ownership: all public tables have RLS; profiles are owner/admin-only; public_profiles excludes private fields and is read-only; selected photos remain member-visible in a private bucket; photo mutations check folder and object ownership. Fifteen tests pass, including ten live catalog checks; real non-admin account can read its own profile but not others, anonymous private reads denied. Live photo mutations were not exercised. Public aggregate heart totals remain intentional.
- [x] Make nine admin earnings totals clickable with private paginated records and unpaid-request labels; all nine opened under real admin access at 384×629, including the accepted $65 request fee, with no browser errors. Totals and balances unchanged.
- [x] Move creator Top 10 messages beneath Requests and show all five picture-frame styles together; verified signed-in at 384×629: messages open and every frame is visible/selectable, with no browser errors. Existing teaser video still cannot decode in test Chromium.
- [x] Restore clickable Top 10 conversations on both dashboards; verified the existing saved message opens and reopens from the real creator dashboard. Customer inbox added; customer-side browser verification remains unavailable with the current creator session.
- [x] Add private staged request upload, server-managed 14-day paid delivery access, token renewal after expiry, and creator workspace archive without deleting customer videos, shared by both genders. Request payment checkout remains blocked pending approved provider integration below.
- [x] Add adjustable 0–100% VIP fog intensity to creator and customer dashboard controls, saved on this device.
- [x] Run 15 delivery/fog/pricing/watermark tests; build OK and media authorization function deployed. Restored real customer session, accepted legal waiver, and reached unpaid entry-pass gate without browser errors.
- [ ] Verify real paid request upload, customer playback, renewal and creator cleanup end-to-end: blocked by unfinished approved-provider request checkout and available customer session's unpaid entry pass.
- [x] Add private monthly creator revenue history with original splits, full-month totals, and paginated records; eight tests pass and build OK. Signed-in creator can open Analytics and select the current month; account has no completed earnings, so historical populated-month navigation remains unverified.
- [x] Synchronize profile/card/search hearts and creator analytics using public aggregate-only realtime totals; heart persistence tests pass.
- [x] Replace vault coins and favicon/Apple/PWA icons with official gold DTT art.
- [ ] Explicit gold Open Graph image: waiting for an absolute published gold-image URL; hosting continues supplying its social preview.
- [x] Add six-second language transition overlay; signed-in countdown and German legal footer translation verified.
- [x] Enforce explicit Both preference for gender choices across feed, search and library; three rule tests pass.
- [x] Add paged uncapped teaser collection, carousel, previews, active day/month selection and decorative frames; real temporary photo upload, preview, deletion, day activation and frame save/reopen verified.
- [x] Group requests by origin country with ranked counts and expandable lists; real request expanded; legacy request without country remains honestly labeled not recorded.
- [x] Verify changed rules and available real-account flows: 13 tests pass, build OK, no browser errors. Existing video cannot decode in test Chromium; preview now shows a clear error instead of endless loading. Customer cross-account realtime and month-expiry behavior not end-to-end verified with the available creator session.

- [x] Add creator welcome-back gold DTT token cascade with actual away earnings, optional coin sound, and detailed analytics navigation; four math tests and browser checks with mocked earnings pass for login, return after 30 seconds away, sound, reduced motion, and dismissal.

- [x] Burn DTT branding into new creator videos and photos, with the second T pink; browser-exported photo and video visibly verified and video audio retained.
- [x] Assess already-uploaded media separately: existing uploads require replacement/reprocessing; no claim that old files are branded. Large videos above the current 512 MB device-processing limit require a dedicated processing service.

- [x] Default to DTT during loading and before selfies; add full per-letter circular color selection (12 tests and browser save/reload check passed with mocked persistence); deploy further simplified customer cartoon instructions (new selfie appearance not yet reviewed)

- [x] Add robust on-device facial landmark mapping
- [x] Add authenticated streamed realistic portrait generation
- [x] Save generated portraits privately and render them across social views
- [x] Preserve Avatar Studio state through camera handoff and generation
- [x] Verify mobile studio flow, AI response, tests, and preview build
- [x] Restrict generated portrait downloads to an explicitly approved access model

- [x] Upgrade photo-generated avatars to a consistent high-detail illustrated portrait style for women and men
- [x] Verify generated portraits remain saved to the correct profile
- [x] Make each creator's selfie the identity anchor for the polished illustrated avatar style
- [x] Make snapped avatars privacy-safe cartoon likenesses matching the approved profile example
- [x] Make customer portraits more discreet and cartoon-like, with respectful framing for every face shape and size
- [x] Creators: real profile photo shown in the feed, creator page, dashboard, and libraries; illustrated creator portrait used in private interactions. Customers: discreet cartoon only.
- [x] Simplify customer profiles to selfie-only private emoji identities with saved Women/Men style and public avatar names
- [x] Add Fill Your Vault purchase entry, account-backed balance, and return-to-dashboard control
- [x] Generate discreet cartoon customer avatars and more realistic creator likeness portraits from secure account roles
- [x] Separate drawn, cel-shaded customer cartoons from creator animated likenesses
- [x] Harden portrait replacement with collision-safe account paths and failed-save cleanup
- [x] Add per-letter DTT icon colors with saved choices and optional selfie portraits
- [x] Tighten customer cartoon privacy; verify icon rendering, save payload/reload with mocked persistence, and tests (new selfie output not tested)
- [x] Deploy drawn customer cartoon style; nine regression tests pass and live generation from the supplied cartoon reference succeeds (real-selfie likeness still needs user review)
- [x] Replace native camera handoff with in-page capture/upload and remove device landmark scanning; browser capture/upload and mocked auto-save pass without navigation or page errors (real-phone confirmation pending)

- [x] Yoti age check: use uploaded sandbox key file (signed requests)

- [x] Custom request workflow: real database-backed offers, creator accept/decline/counter, customer counter-offer response, 14-day expiry, 42-hour fulfillment deadline, private per dashboard, creator reuse video tip
- [ ] Tips: add $4 card processing fee and wire to real payment (crypto invoice or CCBill when live)
- [ ] Custom request payment step: wire accepted requests to crypto/card checkout after creator accepts

## Waiting on the user (off-site)

- [ ] Hire a Pennsylvania registered agent (CROP) and file Change of Registered Office so the public LLC record stops showing the home address. Deferred by user.
- [ ] Register the DMCA agent ($6) using the agent's address, then send it over so the site's DMCA page matches the registration exactly.
- [ ] CCBill application: DTT Media LLC legal name (becomes the card-statement descriptor), EIN letter or Articles of Incorporation, one US government photo ID for the principal, a business bank account in the LLC's name with a real statement/voided check (app screenshots rejected), dropthatthingmedia@gmail.com as contact, apply as high risk for adult digital products, realistic estimated annual sales. Then approval brings the four dashboard values: account number, subaccount, FlexForm ID, salt. Confirm the per-transaction ticket cap before selling the $101 five-token package.
- [ ] Switch GoDaddy Email Privacy forwarding from the other business's Gmail to dropthatthingmedia@gmail.com.
- [ ] NOWPayments: written yes on adult content from support, 2FA on, IPN key and API key created, then hand the keys over through the secure form so the crypto checkout can be switched from Trybit.
- [ ] Trybit: do not submit the live-mode request; leave the saved payment-notice address as it is.
- [ ] Yoti: switch the age check to live mode so creator uploads unlock.
- [ ] Virtual mailbox address for DTT Media LLC, then put it on the DMCA, Contact and records pages, the $6 Copyright Office listing and the CCBill application.

- [x] Full button-by-button test signed in as a creator and a customer (customer dashboard behind unpaid entry pass)
- [x] Translate every word on every page into the visitor's language, including creator pages viewed from other countries
- [x] Globe: pick a country for the day → that country's own scrollable teaser feed, split Women/Men
- [x] Globe: owner switch between the DTT brand look and the real-Earth look, saved for everyone; both skins photographed in the running app, saved choice confirmed to drive which one shows, anyone can read it, signed-out visitors cannot change it (the admin GLOBE tab itself still needs the owner's own tap)
