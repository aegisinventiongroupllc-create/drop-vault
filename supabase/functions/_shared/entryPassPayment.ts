export const ENTRY_PASS_AMOUNT_USD = 20;

export function invoiceKey(value: unknown): string {
  return typeof value === "string" ? value.replace(/^INV-/i, "") : "";
}

export interface PassReceipt {
  payment_id: string;
  order_id: string;
  user_id: string;
  amount_usd: number | string;
  currency: string;
  method: string;
}

// Only authoritative merchant API data is accepted, never postback amounts.
export function verifyEntryPassInvoice(receipt: PassReceipt, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Record<string, unknown>;
  const amount = Number(invoice.amount_in_fiat);
  const paid = Number(invoice.amount_paid);
  const due = Number(invoice.amount_to_pay);
  return receipt.method === "crypto"
    && Number(receipt.amount_usd) === ENTRY_PASS_AMOUNT_USD
    && receipt.currency === "USD"
    && invoiceKey(invoice.uuid) === invoiceKey(receipt.payment_id)
    && invoice.order_id === receipt.order_id
    && invoice.fiat_currency === "USD"
    && invoice.test_mode === false
    && (invoice.status === "paid" || invoice.status === "overpaid")
    && Number.isFinite(amount) && amount === ENTRY_PASS_AMOUNT_USD
    && Number.isFinite(paid) && Number.isFinite(due) && due > 0 && paid >= due;
}

export async function confirmEntryPassInvoice(
  receipt: PassReceipt,
  lookup: () => Promise<unknown>,
  markVerified: () => Promise<void>,
  credit: () => Promise<void>,
): Promise<void> {
  if (!verifyEntryPassInvoice(receipt, await lookup())) throw new Error("Payment not verified");
  await markVerified();
  await credit();
}