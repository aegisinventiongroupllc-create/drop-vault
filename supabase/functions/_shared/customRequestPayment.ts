import { invoiceKey } from "./entryPassPayment.ts";

export const CUSTOM_REQUEST_FEES_USD = 5; // $1 DTT fee + $4 processing cover
export const MAX_CUSTOM_REQUEST_BASE_USD = 10001;

export interface CustomRequestReceipt {
  payment_id: string;
  order_id: string;
  request_id: string;
  user_id: string;
  base_usd: number | string;
  amount_usd: number | string;
  currency: string;
}

export interface PayableRequest {
  id: string;
  customer_id: string;
  status: string;
  amount_usd: number | string;
}

/** Server price for an agreed request; null when it cannot be paid by this user. */
export function priceAgreedRequest(request: PayableRequest | null, userId: string): { base_usd: number; amount_usd: number } | null {
  if (!request || request.customer_id !== userId || request.status !== "accepted") return null;
  const base = Number(request.amount_usd);
  if (!Number.isFinite(base) || base <= 0 || base > MAX_CUSTOM_REQUEST_BASE_USD) return null;
  return { base_usd: base, amount_usd: Math.round((base + CUSTOM_REQUEST_FEES_USD) * 100) / 100 };
}

// Receipt values come only from the server; invoice values only from the merchant API.
export function verifyCustomRequestInvoice(receipt: CustomRequestReceipt, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Record<string, unknown>;
  const base = Number(receipt.base_usd);
  const total = Number(receipt.amount_usd);
  const amount = Number(invoice.amount_in_fiat);
  const paid = Number(invoice.amount_paid);
  const due = Number(invoice.amount_to_pay);
  return !!receipt.payment_id && !!receipt.order_id && !!receipt.request_id && !!receipt.user_id
    && Number.isFinite(base) && base > 0 && base <= MAX_CUSTOM_REQUEST_BASE_USD
    && Math.abs(total - (base + CUSTOM_REQUEST_FEES_USD)) < 0.001
    && receipt.currency === "USD"
    && invoiceKey(invoice.uuid) === invoiceKey(receipt.payment_id)
    && invoice.order_id === receipt.order_id
    && invoice.fiat_currency === "USD"
    && invoice.test_mode === false
    && (invoice.status === "paid" || invoice.status === "overpaid")
    && Number.isFinite(amount) && Math.abs(amount - total) < 0.001
    && Number.isFinite(paid) && Number.isFinite(due) && due > 0 && paid >= due;
}

export async function confirmCustomRequestInvoice(
  receipt: CustomRequestReceipt,
  lookup: () => Promise<unknown>,
  markVerified: () => Promise<void>,
  markPaid: () => Promise<boolean>,
): Promise<boolean> {
  if (!verifyCustomRequestInvoice(receipt, await lookup())) throw new Error("Request payment not verified");
  await markVerified();
  return await markPaid();
}
