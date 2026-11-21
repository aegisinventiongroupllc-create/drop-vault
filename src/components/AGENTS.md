# Component architecture rules
- Customer waiting-list celebration is transient after first successful joining; reloads and country updates only restore the saved ticket. Why: membership state must not replay a signup celebration.
- Customer pre-launch routing precedes preferences, media and checkout; waitlist records are account-owned and admin pagination is role-verified on the server. Lifetime annual-entry discounts come from server membership offers, never browser input. Why: avoid early charges, private-list leaks and forged prices.
- Creator launch displays use a compact countdown during setup and dashboard navigation; VIP interest belongs only in Analytics, separate from purchase inventory. Why: keep identity setup reachable and avoid implying free interest grants a pass.
- CreatorPaymentOverview is public information above age consent, never a replacement for consent or payment verification. Why: explain payout readiness without granting entry or promising settlement.

- Intro presentation stays scoped to launch-intro.css; reduced motion shows the unobscured globe immediately. Why: opening changes must not alter shared entry, idle or saved themes.
- Intro entry readiness uses a shared timer hook to gate text visibility and dismissal together. Why: hidden prompts must not permit premature entry.
- Hide the global language pill only when an unobscured page selector exists; never let open-menu selections start dragging. Why: retain pre-entry language access without duplicates.
- Fifth-video access uses its own server purchase and the existing atomic unlock/escrow; signing filters unpaid fifth videos and storage applies a restrictive entitlement rule. Why: regular or annual access must never bypass its separate payment.
- VIP waiting-list tickets use saved queue identity, never purchase inventory; owner lists use role-verified paginated RPCs and distinguish interest from receipt-verified ownership. Why: downloaded tickets cannot grant benefits or disclose other creators.
- Future-world announcements are passive and shared by creator, customer and prelaunch views, with no token claim actions. Why: concepts must not imply funded rewards or active mining.
- Customer tickets pre-render locally as branded PNGs before the save gesture; use native file sharing on supported phones. Why: preserve private membership data and reliable mobile saving without granting access.
- Waiting-list invitations use a singleton cutoff campaign, private account notices and bounded email batches with durable idempotency; server checks admin, launch and provider readiness. Why: invite everyone without browser-authorized charges, duplicate campaigns or unbounded mail requests.
