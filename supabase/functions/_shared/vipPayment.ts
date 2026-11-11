import { invoiceKey } from "./entryPassPayment.ts";

export const VIP_PRICES = { PRO_PASS: 1500, ELITE_PASS: 3500 } as const;
export type VipPass = keyof typeof VIP_PRICES;
export function vipPrice(pass: unknown): number | null {
  return pass === "PRO_PASS" || pass === "ELITE_PASS" ? VIP_PRICES[pass] : null;
}
export function vipRemaining(cap: number, sold: number, held = 0): number {
  return Math.max(0, Math.min(cap, 1000) - sold - held);
}
export interface VipReceipt {
  payment_id: string; order_id: string; creator_id: string;
  pass_type: string; amount_usd: number | string; currency: string;
}
export function verifyVipInvoice(receipt: VipReceipt, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Record<string, unknown>;
  const price = vipPrice(receipt.pass_type);
  const paid = Number(invoice.amount_paid), due = Number(invoice.amount_to_pay);
  return price !== null && Number(receipt.amount_usd) === price && receipt.currency === "USD"
    && !!receipt.creator_id && !!receipt.payment_id && !!receipt.order_id
    && invoiceKey(invoice.uuid) === invoiceKey(receipt.payment_id)
    && invoice.order_id === receipt.order_id && invoice.fiat_currency === "USD"
    && invoice.test_mode === false && ["paid", "overpaid"].includes(String(invoice.status))
    && Number(invoice.amount_in_fiat) === price
    && Number.isFinite(paid) && Number.isFinite(due) && due > 0 && paid >= due;
}
export async function confirmVipInvoice(receipt: VipReceipt, lookup: () => Promise<unknown>, mark: () => Promise<void>, grant: () => Promise<boolean>): Promise<boolean> {
  if (!verifyVipInvoice(receipt, await lookup())) throw new Error("VIP payment not verified");
  await mark();
  return grant();
}
// Never free a payable reservation on a local clock, pending transfer, partial
// payment, test result or unavailable provider. Only authoritative zero-paid
// terminal invoices release stock.
export function vipInvoiceCanRelease(receipt: VipReceipt, value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Record<string, unknown>;
  return invoiceKey(invoice.uuid) === invoiceKey(receipt.payment_id)
    && invoice.order_id === receipt.order_id && invoice.test_mode === false
    && invoice.fiat_currency === receipt.currency
    && Number(invoice.amount_in_fiat) === Number(receipt.amount_usd)
    && ["expired", "canceled", "cancelled"].includes(String(invoice.status))
    && Number(invoice.amount_paid) === 0;
}