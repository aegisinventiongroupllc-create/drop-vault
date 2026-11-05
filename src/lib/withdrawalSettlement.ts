// Mirrors public.settle_creator_withdrawal: 100 Bit-cents = 1 token ($20 value), never cash.
export const vaultCreditBitCents = (daysLeft: number) => Math.round((daysLeft * 100) / 14);
export const creatorClawbackUsd = (daysLeft: number, creatorCutUsd = 18) => Math.round((daysLeft * creatorCutUsd / 14) * 100) / 100;
export const BUYOUT_CREDIT_WINDOW_DAYS = 14;
export function settleCreator(pendingUsd: number, clawbackUsd: number) {
  const deducted = Math.min(pendingUsd, clawbackUsd);
  return { deducted, dttCovers: +(clawbackUsd - deducted).toFixed(2), finalNet: +(pendingUsd - deducted).toFixed(2) };
}
