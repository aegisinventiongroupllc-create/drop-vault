import { COUNTRIES } from "@/components/GlobalPassport";
import { isBlockedCountry } from "@/lib/restrictedCountries";
export interface FoundingSlotRecord { creator_id: string; country: string; vault_side: "women" | "men"; slot: number }
export const foundingCountries = () => COUNTRIES.filter((c) => c.code !== "GLOBAL" && !isBlockedCountry(c.code));
export function foundingSlots<T extends FoundingSlotRecord>(rows: T[], country: string, side: "women" | "men") {
  return Array.from({ length: 10 }, (_, i) => ({ slot: i + 1, creator: rows.find((r) => r.country === country && r.vault_side === side && r.slot === i + 1) ?? null }));
}
