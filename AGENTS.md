# Project architecture rules

- Send customer authentication callbacks to `https://dropthatthing.com` so production recovery and confirmation never route through an editor preview domain.
- Treat `profiles.email` as private account data; social surfaces read only handle and avatar data from `public_profiles`.
- Keep character configuration in `profiles.avatar_config` and render it through the shared `ProfileAvatar` component so every social surface stays consistent.
- Store DTT letter colors as validated palette identifiers in the shared avatar configuration, not image files or arbitrary CSS; this keeps icon rendering consistent and avoids AI costs.
- Generate uniform matte 3D animated profile portraits server-side from an in-memory selfie; never persist originals, and store only generated portraits in account-scoped paths in the private profile-avatars bucket.
- Store creator public photos in an account-owned private gallery; show the selected real photo on creator discovery surfaces while private interactions continue using the generated emoji.
