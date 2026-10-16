import type { CreatorEarning } from "./creatorWelcomeBack";

export interface RevenueRecord extends CreatorEarning {
  creator_share_percent: number;
  entry_tax: number;
  platform_commission: number;
}

export function revenueMonthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid revenue month");
  const [year, number] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, number - 1, 1)).toISOString(),
    end: new Date(Date.UTC(year, number, 1)).toISOString(),
  };
}

export function recordedSplit(row: Pick<RevenueRecord, "creator_share_percent">) {
  return Number(row.creator_share_percent);
}

export const REVENUE_FIELDS = "id, created_at, amount_usd, creator_share_usd, platform_share_usd, payment_id, purchase_id, creator_share_percent, entry_tax, platform_commission";