export const ACCESS_DAYS = 14;
export const ANNUAL_ACCESS_DAYS = 26 * ACCESS_DAYS;
export const spendableTokens = (tokens: number, bitCents: number) => tokens + Math.floor(bitCents / 100);
export function escrowAtDay(day: number, creatorUsd = 18) {
  const earned = Math.round(creatorUsd * Math.max(0, Math.min(1, day / ACCESS_DAYS)) * 100) / 100;
  return { earned, payable: day >= ACCESS_DAYS ? creatorUsd : 0, unearned: +(creatorUsd - earned).toFixed(2) };
}