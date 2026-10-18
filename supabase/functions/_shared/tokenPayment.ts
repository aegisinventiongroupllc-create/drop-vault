import { invoiceKey } from "./entryPassPayment.ts";

export interface TokenReceipt {
  payment_id: string;
  order_id: string;
  user_id: string;
  tokens: number;
  amount_usd: number | string;
  currency: string;
}

// Receipt fields come only from the server catalog; invoice fields come only
// from the authenticated merchant API, never the notification or browser.
export function verifyTokenInvoice(receipt: TokenReceipt, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Record<string, unknown>;
  const amount = Number(invoice.amount_in_fiat);
  const paid = Number(invoice.amount_paid);
  const due = Number(invoice.amount_to_pay);
  return Number.isInteger(receipt.tokens) && receipt.tokens >= 1 && receipt.tokens <= 100
    && Number(receipt.amount_usd) === receipt.tokens * 25
    && receipt.currency === "USD"
    && !!receipt.payment_id && !!receipt.order_id && !!receipt.user_id
    && invoiceKey(invoice.uuid) === invoiceKey(receipt.payment_id)
    && invoice.order_id === receipt.order_id
    && invoice.fiat_currency === "USD"
    && invoice.test_mode === false
    && (invoice.status === "paid" || invoice.status === "overpaid")
    && Number.isFinite(amount) && amount === Number(receipt.amount_usd)
    && Number.isFinite(paid) && Number.isFinite(due) && due > 0 && paid >= due;
}

export async function confirmTokenInvoice(
  receipt: TokenReceipt,
  lookup: () => Promise<unknown>,
  markVerified: () => Promise<void>,
  credit: () => Promise<boolean>,
): Promise<boolean> {
  if (!verifyTokenInvoice(receipt, await lookup())) throw new Error("Token payment not verified");
  await markVerified();
  return await credit();
}