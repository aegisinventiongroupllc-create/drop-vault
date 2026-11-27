import { calculateCustomRequestSplit } from "@/lib/tokenEconomy";

export default function RequestPriceSummary({ amount, creatorPercent = 85, days = 2 }: { amount: number; creatorPercent?: 85 | 90; days?: number }) {
  const split = calculateCustomRequestSplit(amount, creatorPercent);
  const rows: [string, number][] = [["Custom request price", amount], [`Creator payout (${creatorPercent}%)`, split.creatorShare], [`DTT platform share (${100 - creatorPercent}%)`, split.platformShare], ["Checkout service fee", split.adminFee], ["Processing cover", split.processingFee]];
  return <div className="space-y-2 text-sm">
    <dl className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd className="shrink-0 font-medium text-foreground">${value.toFixed(2)}</dd></div>)}
      <div className="flex justify-between gap-4 border-t border-border pt-2 font-bold"><dt>Total due at checkout</dt><dd className="shrink-0 text-primary">${split.invoiceTotal.toFixed(2)}</dd></div></dl>
    <p className="text-xs text-muted-foreground">The creator and DTT shares divide the request price; they are not extra charges. The $5 buyer-paid checkout fee does not reduce the creator payout. Processing cover is DTT pricing, not a verified third-party charge.</p>
    <p className="text-xs text-muted-foreground">Turnaround: {days} day{days === 1 ? "" : "s"} after verified payment. Delivered media access lasts 14 days.</p>
  </div>;
}