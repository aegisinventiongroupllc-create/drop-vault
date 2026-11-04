// Shared integer-dollar catalog. Browser input never supplies a price.
export function tokenBundleTotal(quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error("Choose between 1 and 100 Bit-Tokens");
  }
  const remainder = quantity % 10;
  return Math.floor(quantity / 10) * 230 + Math.floor(remainder / 5) * 120 + (remainder % 5) * 25;
}

// Historical server-created receipts retain their original contracted total.
export function validTokenReceiptPrice(tokens: number, amount: number): boolean {
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > 100) return false;
  return amount === tokenBundleTotal(tokens) || amount === tokens * 25;
}