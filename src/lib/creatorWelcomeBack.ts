export interface CreatorEarning {
  id: string;
  created_at: string;
  amount_usd: number;
  creator_share_usd: number;
  platform_share_usd: number;
  payment_id: string | null;
  purchase_id: string | null;
}

export function earnedTokenCount(row: CreatorEarning): number {
  // Only actual token allocations, never dollar tips or net-payout equivalents.
  return row.purchase_id || /^(unlock-|autorenew-)/.test(row.payment_id ?? "")
    ? Number(row.amount_usd) / 20
    : 0;
}

export function summarizeCreatorEarnings(rows: CreatorEarning[]) {
  return rows.reduce((sum, row) => ({
    usd: sum.usd + Number(row.creator_share_usd),
    tokens: sum.tokens + earnedTokenCount(row),
  }), { usd: 0, tokens: 0 });
}

export const EARNING_FIELDS = "id, created_at, amount_usd, creator_share_usd, platform_share_usd, payment_id, purchase_id";
export const AWAY_MINIMUM_MS = 30_000;