import { COUNTRIES } from "@/components/GlobalPassport";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import type { CreatorCategory } from "@/lib/creatorCategories";
export const FOUNDING_SLOTS = 5;
export const FOUNDING_SPLIT = { creator: 91, platform: 9 } as const;
export interface FoundingSlotRecord { creator_id: string; country: string; vault_side: CreatorCategory; slot: number }
export const foundingCountries = () => COUNTRIES.filter((c) => c.code !== "GLOBAL" && !isBlockedCountry(c.code));
export function foundingSlots<T extends FoundingSlotRecord>(rows: T[], country: string, side: CreatorCategory) {
  return Array.from({ length: FOUNDING_SLOTS }, (_, i) => ({ slot: i + 1, creator: rows.find((r) => r.country === country && r.vault_side === side && r.slot === i + 1) ?? null }));
}
