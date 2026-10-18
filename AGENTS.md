# Project architecture rules
- Crypto pass/token credits require server-only authorization and matching verified checkout receipts; reconcile merchant invoices and credit idempotently. Why: unpaid calls and retries cannot create extra access or tokens.
- Admin finance drilldowns use the server-verified guard and stable paginated allowlisted queries matching overview filters; flag accepted requests as unconfirmed. Why: protect records without changing totals or balances.
- Retain custom-request deliveries in a separate private bucket; creator cleanup archives the workspace entry, while server-managed payment/delivery fields and customer-expiring access preserve the retained copy. Why: creator deletion must never invalidate customer delivery, and agreement is not proof of payment.
- Renew request access and subscriptions atomically: lock balances/access, preserve ledger splits, and reject duplicate cycles. Subscription renewal is service-only and checks expected expiry. Why: retries must not double-charge or leave partial earnings.

- Revenue and dashboard metrics aggregate complete account-scoped earnings server-side in UTC; paginate history and filter/coalesce realtime. Why: prevent truncated earnings and unrelated refresh storms.

- Welcome-back summaries read account-scoped completed ledger rows only; admin samples never write them.

- Auth callbacks go to `https://dropthatthing.com`; Google uses the generated Cloud helper and owner Auth credentials, not app secrets. Why: retain secure Google sign-in.
- Profiles are owner/admin-only; public_profiles is a read-only safe projection; photo writes require folder and file ownership. Why: prevent identity leaks and cross-account edits.
- Use ProfileAvatar for avatar_config.
- Validate avatar letter colors; use the iro wheel and SVG fills, never arbitrary CSS. Why: safe full-spectrum customization.
- Generate role-specific portraits server-side from in-memory selfies; never save originals. Keep generated portraits account-private to protect identity.
- Creator real photos stay in owner-owned private galleries; discovery shows the selected photo, private interactions the emoji. Why: separate public and private identity.
- Capture bounded-resolution selfies in-page; release tracks on capture/close and skip landmark scanning. Why: avoid phone camera handoffs and heavy WASM.
- Prebundle color pickers with deduped React to avoid mixed hook chunks.
- Process new creator media through the shared permanent watermark encoder before storage uploads, including the public photo gallery; fail closed on encoding errors and exclude private verification documents and customer selfies, because display overlays do not brand downloaded files.

- CCBill: server-signed FlexForms, IP-restricted webhook, catalog-price verification, idempotent credits; hide cards without secrets. Why: prevent forged payment.

- Creator uploads require owner role, reviewed approval and latest live server-confirmed Yoti pass; IDs/avatars excluded. Why: prevent verification bypass.

- Chargeback lockouts are applied only by the server-side CCBill webhook via handle_chargeback; bans live in account_bans (not profiles) so users cannot clear them, and admins lift them with admin_lift_ban. Why: user-editable rows must never control bans.
- Global AutoTranslator uses bounded versioned caches/retries and per-service miss coalescing; owner/code areas notranslate. Why: avoid duplicate work; cross-instance deduplication remains separate.
- Publish heart totals through a trigger-maintained aggregate table, never public fan rows; subscribe social surfaces and creator analytics to totals so counts update without revealing identities.
- Keep teaser frames and activation windows on account-owned media; select one active item atomically through an owner-validated function, fall back to latest after expiry, and preserve permanent upload watermarking.
- Capture request country server-side from the requesting account at creation and preserve it on updates; rank scoped request groups without exposing private profile fields.
- Resolve customer gender visibility from the persisted explicit preference, including search and library, rather than inferring Both from an absent active vault.
- Share vault token artwork and teaser viewport frame styles across studio and feed, and persist language countdown start across reloads so transitions remain continuous.

- Chats reuse TopFansSection; inbox reads account-scoped fan_messages and public_profiles for privacy.

- Personal colors use validated ui_theme and color-blended renderers; independent idle sky fields and opt-in dashboard sky never change public profiles. Why: isolate personal choices.
- Requests turn paid only via service-only mark_custom_request_paid with a verified receipt at the agreed price; a trigger blocks other paid/completed moves. Why: agreement never unlocks delivery.

- Page search/media reads and refresh authorized vault links no later than access expiry. Why: avoid bulk downloads and stale access.
- Shared resumable uploads accept already-watermarked files; failed registration cleans staging or reports failure. Why: interruptions cannot silently succeed.
