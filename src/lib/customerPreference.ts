import { isCreatorCategory, type CreatorCategory } from "./creatorCategories";
export type CustomerPreference = CreatorCategory | "both";
export function allowedVaults(preference: CustomerPreference | null | undefined): CreatorCategory[] {
  return preference === "both" ? ["women", "men"] : isCreatorCategory(preference) ? [preference] : ["women"];
}