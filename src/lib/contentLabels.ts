export const CONTENT_LABELS = {
  dance: "Dance", twerking: "Twerking", fitness: "Fitness", cosplay: "Cosplay",
  solo: "Solo", "multiple-performers": "Multiple performers", "non-explicit": "Non-explicit",
  "penis-visible": "Penis visible", "vulva-visible": "Vulva visible", "no-genitals-visible": "No genitals visible",
} as const;
export function validContentLabels(values: string[]): boolean {
  return values.length > 0 && values.every(value => Object.prototype.hasOwnProperty.call(CONTENT_LABELS, value));
}