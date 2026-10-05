# Project architecture rules

- Send customer authentication callbacks to `https://dropthatthing.com` so production recovery and confirmation never route through an editor preview domain.
- Treat `profiles.email` as private account data; social surfaces read only handle and avatar data from `public_profiles`.
- Keep character configuration in `profiles.avatar_config` and render it through the shared `ProfileAvatar` component so every social surface stays consistent.
- Store DTT letter colors as validated six-digit hex colors or legacy palette identifiers in the shared avatar configuration; use the iro circular picker and render validated values only as SVG fills, never arbitrary CSS, to support the full color spectrum safely without AI costs.
- Generate role-specific illustrated portraits server-side (drawn customer cartoons, animated creator likenesses) from in-memory selfies; never persist originals, and store only generated portraits in account-scoped private paths to protect identity.
- Store creator public photos in an account-owned private gallery; show the selected real photo on creator discovery surfaces while private interactions continue using the generated emoji.
- Capture selfies in an in-page camera with bounded resolution and release tracks on capture/close; skip client landmark scanning in the selfie-only flow to avoid phone camera handoffs and heavy WASM processing.
- Prebundle the color-picker dependencies alongside the deduplicated React runtime in Vite so lazy profile loading does not trigger dependency optimization and mixed React hook chunks in active previews.
- Process new creator media through the shared permanent watermark encoder before storage uploads, including the public photo gallery; fail closed on encoding errors and exclude private verification documents and customer selfies, because display overlays do not brand downloaded files.
