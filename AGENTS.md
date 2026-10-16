# Project architecture rules

- Keep creator welcome-back summaries read-only and account-scoped to completed transaction ledger rows; track last activity locally for display only, count tokens from allocation records rather than net revenue, and never alter balances for celebrations. Admin replay uses explicitly labeled sample earnings and never writes to the ledger.

- Send customer authentication callbacks to `https://dropthatthing.com` so production recovery and confirmation never route through an editor preview domain.
- Treat `profiles.email` as private account data; social surfaces read only handle and avatar data from `public_profiles`.
- Keep character configuration in `profiles.avatar_config` and render it through the shared `ProfileAvatar` component so every social surface stays consistent.
- Store DTT letter colors as validated six-digit hex colors or legacy palette identifiers in the shared avatar configuration; use the iro circular picker and render validated values only as SVG fills, never arbitrary CSS, to support the full color spectrum safely without AI costs.
- Generate role-specific portraits server-side (drawn customer cartoons, near-photoreal flattering creator likenesses) from in-memory selfies; never persist originals, and store only generated portraits in account-scoped private paths to protect identity.
- Store creator public photos in an account-owned private gallery; show the selected real photo on creator discovery surfaces while private interactions continue using the generated emoji.
- Capture selfies in an in-page camera with bounded resolution and release tracks on capture/close; skip client landmark scanning in the selfie-only flow to avoid phone camera handoffs and heavy WASM processing.
- Prebundle the color-picker dependencies alongside the deduplicated React runtime in Vite so lazy profile loading does not trigger dependency optimization and mixed React hook chunks in active previews.
- Process new creator media through the shared permanent watermark encoder before storage uploads, including the public photo gallery; fail closed on encoding errors and exclude private verification documents and customer selfies, because display overlays do not brand downloaded files.

- Card checkout runs through CCBill FlexForms built server-side with a salted digest; the unsigned webhook credits only from CCBill IP ranges, re-checks price against the server catalog, and credits idempotently per transaction id. The card button stays hidden until all CCBill secrets exist.

- Creator age checks use Yoti's hosted Age Verification started and resolved server-side; results are stored per account in yoti_age_checks (owner read-only) and requests are signed server-side with the Yoti key stored only in backend secrets.

- Chargeback lockouts are applied only by the server-side CCBill webhook via handle_chargeback; bans live in account_bans (not profiles) so users cannot clear them, and admins lift them with admin_lift_ban. Why: user-editable rows must never control bans.
- Translate UI at runtime with the global AutoTranslator (visitor language → translate-text function, cached in translation_cache and locally); mark owner-only or code-like areas notranslate. Why: hand-written locale files can't cover every language worldwide.
- Publish heart totals through a trigger-maintained aggregate table, never public fan rows; subscribe social surfaces and creator analytics to totals so counts update without revealing identities.
- Keep teaser frames and activation windows on account-owned media; select one active item atomically through an owner-validated function, fall back to latest after expiry, and preserve permanent upload watermarking.
- Capture request country server-side from the requesting account at creation and preserve it on updates; rank scoped request groups without exposing private profile fields.
- Resolve customer gender visibility from the persisted explicit preference, including search and library, rather than inferring Both from an absent active vault.
- Share vault token artwork and teaser viewport frame styles across studio and feed, and persist language countdown start across reloads so transitions remain continuous.
