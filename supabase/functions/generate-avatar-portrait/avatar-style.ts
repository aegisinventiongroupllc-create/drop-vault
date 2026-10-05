export type AvatarAccountType = "creator" | "customer";
export type AvatarPresentation = "woman" | "man";

const UNIFORM_3D_STYLE = [
  "UNIFORM ART DIRECTION: create a premium professional 3D animated character portrait. Every output must belong to the same cohesive portrait-renderer family, regardless of gender, complexion, hair, face shape, or account type.",
  "Use clean vector-like 3D shading with deliberate broad light and shadow shapes, smooth matte clay-like materials, softly rounded dimensional facial planes, crisp silhouettes, controlled ambient occlusion, polished digital-art lighting, and subtle depth without photographic texture.",
  "Features must be expressive and readable at profile-icon size: bright expressive eyes with clean catchlights, clearly defined brows, nose, lips, jaw and chin, sculpted hair clumps with intentional strand groups, and equally defined facial hair when present.",
  "Keep skin smooth and stylized. Do not render pores, camera noise, photographic skin, noisy AI blending, smeared details, double features, painterly randomness, mixed art styles, hyper-realism, uncanny face filters, flat basic vector emoji art, anime, children's art, or a videogame screenshot.",
  "The finish should resemble a high-end animated feature character rendered as a polished social portrait: friendly, modern, dimensional, consistent, and unmistakably illustrated rather than photographed.",
];

const CUSTOMER_DRAWN_STYLE = [
  "DISCRETION FIRST: create a visibly fictional, bold 2D cartoon mascot, NOT a detailed handsome illustrated headshot. Use oversized expressive cartoon eyes, a tiny symbolic nose, a simplified mouth and boldly redesigned facial proportions. Keep only broad complexion, eye color, hairstyle, beard and expression cues; do not trace or reconstruct the photographed face. Use minimal flat graphic shadows, never finely modeled facial anatomy, realistic cheekbones, realistic skin shading or identity-faithful portrait detail.",
  "CUSTOMER ART DIRECTION: a professionally DRAWN CARTOON profile avatar, like a clean editorial character sticker or a polished comic-style social avatar. NOT a realistic 3D render. This art direction takes priority over the source image's photographic appearance.",
  "Draw crisp dark contour outlines around the face, ears, nose, brows, hair, beard and clothing; use smooth flat color fills with only two or three deliberate cel-shaded shadow shapes per feature. Subtle illustrated depth is allowed, but no physically rendered skin, clay sculpture, glossy materials or cinematic lighting.",
  "Use slightly enlarged expressive illustrated eyes, strong graphic brows, a short simplified nose, simplified lips, and friendly stylized facial planes. Hair and beard are bold grouped graphic shapes with a few clean accent strokes, never individual realistic strands.",
  "The final portrait must immediately read as a hand-drawn adult cartoon character at small icon size, not a photo, painted photograph, face filter, realistic digital portrait, or lifelike game character. Do not render pores, photo texture, realistic eyelids, noisy shading, photographic gradients or hyper-realism.",
];

const SHARED_COMPOSITION = [
  "Composition: exactly one character, centered head and upper shoulders, near-front pose, relaxed friendly expression, complete hair and chin visible, and generous safe space for a circular crop. Choose the camera distance for the person's natural face width so no cheek, ear, hair, jaw, or chin is clipped.",
  "Wardrobe: render a clean dark hoodie or crewneck with defined collar, seams, and simplified matte fabric folds, without writing or logos.",
  "Lighting and backdrop: soft cool frontal studio light, shaped charcoal shadows, restrained pink rim light, and a smooth deep-charcoal circular-profile background. Keep the face bright and readable.",
  "Output only the finished portrait. No words, letters, logo, watermark, border, frame, UI, extra person, extra face, extra limbs, obscured face, or cropped chin.",
];

const CUSTOMER_IDENTITY = [
  "CUSTOMER CARTOON OVERRIDE (takes priority over likeness): rebuild the person as an unmistakably fictional drawn cartoon emoji, not a realistic illustrated headshot or a real face with a smoothing filter. Use simplified drawn facial shapes, slightly larger expressive eyes, a compact simplified nose, graphic brows, simplified mouth, and chunky grouped hair and beard shapes. No individual photo-like hair strands, realistic eyelids, skin texture, lifelike anatomy, cinematic photographic lighting, or exact facial reconstruction.",
  "Privacy matters more than exact resemblance. Translate only broad recognizable traits and the expression into the cartoon vocabulary; deliberately change precise eye/nose/mouth proportions and small identifying details. A viewer must immediately see a cartoon avatar rather than recognize a realistic portrait. Retain face fullness respectfully without copying biometric geometry.",
  "CUSTOMER PRIVACY RULE: use the selfie only as a temporary reference for a discreet drawn cartoon resemblance. Preserve broad recognizable traits—face silhouette and fullness, complexion, eye color, hair color/style/texture, eyebrow character, general eye and nose character, facial hair, glasses, visible facial tattoos, and age range—while intentionally redesigning exact biometric measurements and fine identifying details.",
  "FACE-SHAPE INCLUSION IS CRITICAL: respectfully preserve slim, oval, square, round, wide, very full, or extremely large face shapes. Keep a full face recognizably full and attractive. Never slim, narrow, stretch, mock, exaggerate, or crop it.",
  "EXPRESSION: retain the person's intentional selfie expression—cute, smiling, playful, kiss face, sexy/confident, serious, or intimidating—while keeping the result tasteful, friendly, and suitable for a profile icon.",
  "The customer must recognize their overall look, but the result must never be mistaken for their real photograph or an exact biometric reconstruction. Avoid generic stock faces and do not change ethnicity, complexion, hair, facial hair, glasses, age range, or broad facial character.",
];

const CREATOR_IDENTITY = [
  "CREATOR IDENTITY RULE: use the selfie as the identity anchor for a recognizable 3D animated likeness. Preserve the creator's face silhouette and fullness, complexion, eye and nose character, brows, mouth, hair, facial hair, glasses, age range, ethnicity, distinctive proportions, and natural asymmetry.",
  "Keep the creator more identity-faithful than a customer while still obeying the same matte, stylized 3D animated art direction. Do not become photorealistic, copy camera texture, beautify into a different person, slim the face, alter ethnicity, or replace distinctive features.",
  "Retain the creator's intentional selfie expression, including cute, smiling, playful, kiss face, sexy/confident, serious, or intimidating, without exaggeration or distortion.",
];

export function buildAvatarPrompt(accountType: AvatarAccountType, presentation: AvatarPresentation) {
  const identityRules = accountType === "creator" ? CREATOR_IDENTITY : CUSTOMER_IDENTITY;
  const artDirection = accountType === "creator" ? UNIFORM_3D_STYLE : CUSTOMER_DRAWN_STYLE;
  return [
    ...artDirection,
    ...identityRules,
    `Presentation mode is ${presentation}. This changes presentation only; women and men receive identical production quality and the same account-specific illustration standard.`,
    ...SHARED_COMPOSITION.map((rule) => accountType === "customer" && rule.startsWith("Lighting and backdrop:")
      ? "Lighting and backdrop: simple drawn highlights and clean cel-shaded shadows on a smooth deep-charcoal background, with a restrained illustrated pink edge accent. No photographic studio illumination. Keep the face bright and readable."
      : rule),
  ].join(" ");
}