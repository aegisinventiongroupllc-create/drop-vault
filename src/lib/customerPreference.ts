import { isCreatorCategory, type CreatorCategory } from "./creatorCategories";
export type CustomerPreference = CreatorCategory | "both" | CreatorCategory[];
export function allowedVaults(preference: CustomerPreference | null | undefined): CreatorCategory[] {
  if (Array.isArray(preference)) return [...new Set(preference.filter(isCreatorCategory))];
  return preference === "both" ? ["women", "men"] : isCreatorCategory(preference) ? [preference] : ["women"];
}