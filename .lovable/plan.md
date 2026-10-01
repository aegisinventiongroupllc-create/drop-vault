# Realistic Snap-to-Avatar Upgrade

## Goal
Replace the current color-sampling cartoon result with a secure, high-detail portrait workflow that analyzes the captured face, creates a realistic illustrated likeness, and keeps the user inside Avatar Studio throughout.

## User experience
- Keep the existing **Snap Your Face for Emoji** action and studio layout.
- Show clear stages in place: preparing photo, mapping facial features, creating portrait, and ready to edit.
- Display streamed portrait previews inside the glowing profile ring without navigating away or blanking the page.
- Automatically populate editable appearance controls from the detected face.
- Preserve unfinished studio work across phone camera handoff or page reload.
- Let the user retry a photo, adjust mapped features, refine the portrait, and save it as their public avatar.
- Show actionable errors while keeping the photo and current studio choices available for a manual retry.

## Privacy and safety
- Process the captured selfie in memory only; do not save the original photo to storage or the profile.
- Authenticate every portrait request and validate image type and size before processing.
- Save only the generated public portrait and non-sensitive appearance settings.
- Treat this as appearance mapping, not identity recognition or age/identity verification.

## Implementation
- Add an authenticated portrait-generation function that accepts the selfie as a multipart upload.
- Use server-side multimodal analysis to map visible facial structure into validated settings, including jaw structure, eye spacing, nose shape, skin tone, brows, ears, hair, facial hair, and glasses.
- Use the project’s image-editing model to turn the same selfie into a polished, realistic illustrated headshot with dimensional lighting, texture, and a consistent dark-luxury studio treatment.
- Stream image progress back to the studio so long image work does not trigger a timeout or route change.
- Add a private-to-public save step for the generated result: the selfie is discarded after processing; the approved generated portrait is uploaded under the signed-in user’s avatar path.
- Extend the profile avatar configuration with the new mapped facial fields and a generated portrait reference, while retaining the layered fallback for old profiles or failed generation.
- Update the shared avatar renderer so chat, hearts, creator pages, dashboards, and feeds automatically use the realistic portrait when present.
- Persist in-progress settings and generated preview locally until **Save Public Profile** succeeds, then clear the draft.

## Verification
- Test authenticated upload, invalid file, model failure, insufficient-credit, and retry states.
- Verify the studio remains mounted during capture and generation on mobile-sized and desktop viewports.
- Verify the generated portrait and mapped controls save and reappear across social surfaces.
- Run focused tests, type checks, preview build checks, and a live AI request before completion.

## Notes
- Portrait generation uses workspace AI credits per request.
- Existing flat avatars remain as a fallback; no current profile is broken or erased.
