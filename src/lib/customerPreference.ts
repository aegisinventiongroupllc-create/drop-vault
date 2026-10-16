export type CustomerPreference = "women" | "men" | "both";
export function allowedVaults(preference: CustomerPreference | null | undefined): ("women" | "men")[] {
  return preference === "both" ? ["women", "men"] : preference === "men" ? ["men"] : ["women"];
}