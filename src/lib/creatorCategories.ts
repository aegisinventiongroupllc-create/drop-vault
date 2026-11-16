export const CREATOR_CATEGORIES = ["women", "men", "trans_women", "trans_men"] as const;
export type CreatorCategory = typeof CREATOR_CATEGORIES[number];
export const CATEGORY_LABELS: Record<CreatorCategory, string> = {
  women: "Women", men: "Men", trans_women: "Trans Women", trans_men: "Trans Men",
};
export function isCreatorCategory(value: unknown): value is CreatorCategory {
  return CREATOR_CATEGORIES.some(category => category === value);
}
export function matchesCategory(category: unknown, selected: CreatorCategory | "both" | null | undefined): boolean {
  if (!isCreatorCategory(category)) return false;
  return selected == null || selected === "both" ? category === "women" || category === "men" : category === selected;
}