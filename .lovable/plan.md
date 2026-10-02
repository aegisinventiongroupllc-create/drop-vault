# Discreet Customer Emojis and Creator Photo Gallery

## Goal
Separate the two identities clearly:

- **Customers:** a privacy-safe cartoon emoji made from a selfie. It keeps broad recognizable traits and the expression made in the selfie, without becoming an obvious or photo-real copy.
- **Creators:** a real public profile-photo gallery. Creators can upload several photos, choose the active one, switch it anytime, and delete unused photos.

## Customer emoji
- Keep the selfie temporary and in memory only; never save the original photo.
- Tighten generation to the illustrated/cartoon standard in the first reference: clean outlines, simplified facial planes, polished soft shading, friendly profile-picture finish, and no camera-like skin detail.
- Preserve broad traits that help a creator recognize the customer: complexion, face fullness, hair style/color, eye color, facial hair, glasses, and visible face tattoos or markings.
- Deliberately change fine biometric details so the emoji is discreet and cannot be mistaken for the real selfie.
- Match the expression made in the selfie, including cute, kiss, flirty, playful, serious, or intimidating expressions, while keeping the result respectful and profile-safe.
- Keep full and very wide faces well framed without slimming, stretching, caricaturing, or cropping.

## Controlled emoji visibility
- Keep customer emojis out of public feeds, profiles, and libraries.
- Allow a generated emoji to load for its owner and for the creator involved in a private message, heart, or request.
- Continue showing the shared layered fallback anywhere the viewer is not authorized.
- Do not expose email, legal name, selfie, or private storage paths.

## Creator real-photo gallery
- Add a creator-only photo manager to the creator profile/dashboard.
- Allow multiple JPG, PNG, or WEBP uploads with safe size/count limits.
- Show thumbnail choices with **Use as profile photo** and **Delete** actions.
- Keep one active photo at a time; switching must update feeds, creator profiles, search, and My Girls/My Guys immediately.
- Prevent customers from uploading creator photos or changing another creator’s gallery.
- Store gallery records per account and use account-scoped storage paths.

## Where each image appears
- **Feed, creator public profile, search, trending, My Girls/My Guys:** creator’s selected real profile photo.
- **Private messages, heart activity, and requests:** each participant’s saved emoji avatar.
- **Customer public-facing surfaces:** never show a real selfie.
- If a creator has no selected real photo, use the existing generated/layered avatar fallback.

## Data and safety
- Add a creator photo table with explicit grants, row-level access rules, one active photo per creator, ordering, timestamps, and storage path ownership checks.
- Add a dedicated creator-photo storage bucket with creator-owned upload/update/delete rules and public read only for the active profile-photo use case.
- Add a protected avatar-image endpoint for authorized private interaction viewing.
- Keep account type checks on the server, not in browser storage.
- Update the public profile data source to expose only the selected creator photo reference and safe identity fields.

## Verification
- Test customer selfie generation for different skin tones, hair, eye colors, facial hair, face tattoos, face sizes, and several selfie expressions.
- Test creator upload, switch, delete, reload, and fallback behavior.
- Verify creator photos appear in feeds, profiles, search, and libraries, while emoji avatars appear in private interactions.
- Verify customers cannot read other customers’ emoji files or manage creator photos.
- Check phone and desktop layouts, tests, and the live build.

## Note
Existing saved emojis remain intact. Existing creators without a real profile photo continue using their current fallback until they upload one.
