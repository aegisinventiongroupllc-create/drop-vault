export const ADAPTIVE_TAGS = ["adaptive-creator", "mobility-aid-wheelchair-user", "prosthetic-limb-difference", "sensory-inclusive", "plus-size-curvy", "petite", "muscle-athletic", "mature", "custom-request-friendly"] as const;
export type AdaptiveTag = typeof ADAPTIVE_TAGS[number];
export const ADAPTIVE_LABELS: Record<AdaptiveTag, string> = {
  "adaptive-creator": "Adaptive Creator",
  "mobility-aid-wheelchair-user": "Mobility Aid / Wheelchair User",
  "prosthetic-limb-difference": "Prosthetic / Limb Difference",
  "sensory-inclusive": "Sensory Inclusive",
  "plus-size-curvy": "Plus Size / Curvy",
  "petite": "Petite",
  "muscle-athletic": "Muscle / Athletic",
  "mature": "Mature",
  "custom-request-friendly": "Custom Request Friendly",
};
export function isAdaptiveTag(value: unknown): value is AdaptiveTag {
  return ADAPTIVE_TAGS.some(tag => tag === value);
}
export function parseAdaptiveTags(values: unknown): AdaptiveTag[] {
  return Array.isArray(values) ? ADAPTIVE_TAGS.filter(tag => values.includes(tag)) : [];
}
export function matchesAdaptiveTags(values: unknown, selected: AdaptiveTag[]) {
  const tags = parseAdaptiveTags(values);
  return selected.every(tag => tags.includes(tag));
}