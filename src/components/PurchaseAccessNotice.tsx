import { Checkbox } from "@/components/ui/checkbox";

export const PURCHASE_ACCESS_NOTICE =
  "Purchased videos remain accessible for as long as the creator is active on DTT. If a creator closes their account or revokes consent under 2257 rules, video access ends and your remaining balance is credited as Bit-Tokens to your wallet.";

export function PurchaseAccessNotice({ checked, onChange, id = "purchase-access-ack" }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 rounded-md border border-border bg-card/60 p-2 text-left text-[11px] leading-snug text-muted-foreground cursor-pointer">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>{PURCHASE_ACCESS_NOTICE} No cash or card refunds.</span>
    </label>
  );
}
