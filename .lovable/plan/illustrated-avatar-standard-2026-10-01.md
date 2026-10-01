# Illustrated Avatar Standard

## What will change
- Make photo-generated avatars use one polished illustrated portrait style: clean linework, dimensional shading, detailed hair and facial features, natural skin texture, friendly expression, and a dark hoodie/profile-portrait composition inspired by the reference.
- Apply the same fidelity and finish to both women and men without changing the person’s identity, skin tone, facial structure, hair, facial hair, or eyewear.
- Add clothing choices to Avatar Studio and include the selected clothing in every generated portrait.
- Keep the live streamed preview inside Avatar Studio while the portrait renders.
- Save the final generated portrait and its appearance settings under the signed-in user’s own profile path so it returns after future sign-ins.

## Technical details
- Strengthen the server-side image-edit prompt around identity preservation, illustrated rendering, consistent framing, lighting, and gender-equivalent quality.
- Extend `avatar_config` with a validated clothing value and preserve backward compatibility for existing profiles.
- Send all mapped and user-selected appearance details into generation, and make changing a portrait-affecting option clearly require a new photo render rather than silently showing mismatched controls.
- Keep original selfies in memory only; store only the generated portrait.

## Verification
- Test both women’s and men’s generation requests with the same visual-quality rules.
- Confirm streaming previews and final output complete successfully.
- Confirm saving writes only to the signed-in user’s profile and reloads on that profile.
- Run focused tests and verify the mobile Avatar Studio layout.
