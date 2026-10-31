export type VipPass = "NONE" | "PRO_PASS" | "ELITE_PASS";
export const VIP_CAP = 1000;
export const POWER_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export function vaultPercent(pass: VipPass, permanent = 90, powerUntil: number | null = null, now = Date.now()) {
  if (powerUntil !== null && powerUntil > now) return 95;
  return Math.min(92, Math.max(90, permanent, pass === "NONE" ? 90 : 92));
}
export function requestPercent(pass: VipPass) { return pass === "ELITE_PASS" ? 90 : 85; }
export function checkoutAllocation(quantity: number, gateway: "crypto" | "card", actualProcessing = 0) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw Error("Invalid token quantity");
  if (!Number.isFinite(actualProcessing) || actualProcessing < 0) throw Error("Invalid processing fee");
  if (gateway === "card" && (actualProcessing < 1.9 * quantity || actualProcessing > 2.5 * quantity)) throw Error("Card fee outside agreed range");
  return { total: quantity * 25, base: quantity * 20, dttFee: quantity, buffer: quantity * 4,
    processingDeduction: gateway === "card" ? actualProcessing : 0,
    bufferRemaining: quantity * 4 - (gateway === "card" ? actualProcessing : 0),
    networkPassthrough: gateway === "crypto" ? actualProcessing : 0 };
}