# Creator-Likeness Illustrated Avatars

## Goal
Make every creator’s selfie-generated avatar clearly resemble that creator while using the polished, friendly illustrated portrait style in the reference image for both women and men.

## Changes
- Strengthen the portrait-generation instructions so the selfie controls identity: face shape, eyes, nose, brows, skin tone, hair, facial hair, glasses, age, and distinctive traits.
- Standardize the artwork as a clean semi-realistic 2D character portrait with crisp linework, dimensional shading, detailed hair, expressive eyes, dark clothing, and a simple dark backdrop.
- Prevent unwanted genericization, face replacement, excessive beautification, photorealism, anime styling, flat emoji styling, logos, and text.
- Keep the original selfie private and temporary; save only the generated portrait to that creator’s own profile.
- Preserve the existing in-studio loading, preview, adjustment, and save flow.

## Validation
- Test portrait generation for both women’s and men’s modes.
- Confirm the generated result returns in the studio and saves to the signed-in creator’s profile.
- Confirm the app builds successfully.

## Technical details
- Update the server-side image-edit prompt while keeping the existing image model and private portrait storage.
- Continue using the captured selfie as the image-edit identity reference rather than generating from text alone.
