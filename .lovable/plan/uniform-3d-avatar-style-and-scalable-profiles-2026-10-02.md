# Uniform 3D Avatar Style and Scalable Profiles

## What will change
- Make every selfie-generated avatar use one consistent professional 3D animated portrait style for customers and creators.
- Use clean vector-like dimensional shading, smooth matte/clay surfaces, expressive eyes and features, defined hair and facial structure, and a polished digital-art finish.
- Keep customer avatars discreet by preserving broad resemblance while simplifying identifying detail; keep creator avatars more recognizable without becoming photorealistic.
- Reject hyper-realistic skin, photographic blending, noisy textures, inconsistent rendering styles, and generic faces.
- Keep each generated avatar saved only to its signed-in profile with collision-free file names and reliable reload behavior.

## Scale and reliability
- Continue using account-scoped profile records and account-scoped portrait paths so every user has an independent dashboard and avatar.
- Avoid global profile scans or shared mutable portrait files; load only the signed-in account’s dashboard data.
- Make portrait replacement safe: upload the new version, save the profile reference, then remove the previous version.
- Add focused tests for role-specific prompts, style enforcement, unique account paths, and safe save behavior.

## Technical details
- Refactor the portrait instructions into shared uniform 3D-art rules plus customer and creator identity rules.
- Keep image generation server-side with authenticated account-role lookup; the browser cannot choose whether it receives customer or creator treatment.
- Preserve temporary-selfie handling: originals remain in memory and only the generated portrait is saved.
- Keep streamed previews and the existing mobile camera-return protection.

## Verification
- Deploy and test the portrait function for both customer and creator account roles.
- Confirm generated responses complete and use the same 3D animated artistic profile.
- Confirm profile saves and reloads without cross-account collisions.
- Run focused tests and verify the app build.

> Supporting 100 million users also depends on production traffic capacity, storage, regional delivery, and database scaling. This update will make the app’s profile and portrait data paths horizontally safe, but it cannot certify that traffic level without load testing and infrastructure capacity planning.
