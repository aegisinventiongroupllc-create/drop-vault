# Project architecture rules

- Send customer authentication callbacks to `https://dropthatthing.com` so production recovery and confirmation never route through an editor preview domain.
- Treat `profiles.email` as private account data; social surfaces read only handle and avatar data from `public_profiles`.
- Keep the layered character configuration in `profiles.avatar_config` and render it through the shared `ProfileAvatar` component so every social surface stays consistent.- Realistic profile portraits are generated server-side from an in-memory selfie; originals are never persisted, and only generated portraits are stored in the private profile-avatars bucket.
