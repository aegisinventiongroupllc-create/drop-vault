import { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuyTokensModal from "@/components/BuyTokensModal";
import { ENTRY_PASS_PRICE_USD } from "@/lib/tokenEconomy";
import EntryPassGlobe from "@/components/EntryPassGlobe";
import { ENTRY_SUMMARY } from "@/i18n/entryCatalog";
import { useCustomerEntryOffer } from "@/hooks/useCustomerEntryOffer";
import { customerPrelaunch } from "@/lib/customerLaunch";
import { Navigate } from "react-router-dom";
import CustomerPaymentInvitation from "./CustomerPaymentInvitation";

const EntryPassGate = ({ onPurchased }: { onPurchased: () => void }) => {
  const [open, setOpen] = useState(false);
  const offer = useCustomerEntryOffer();
  const price = offer?.amount ?? ENTRY_PASS_PRICE_USD;

  // Pink globe here too, matching the sign-in page; restore the default tone when leaving.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.getPropertyValue("--globe-tone");
    root.style.setProperty("--globe-tone", "#ff4da6");
    return () => {
      if (prev) root.style.setProperty("--globe-tone", prev);
      else root.style.removeProperty("--globe-tone");
    };
  }, []);

  if (customerPrelaunch()) return <Navigate to="/" replace />;
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(600px circle at 50% 20%, color-mix(in srgb, var(--primary) 25%, transparent), transparent 60%)",
        }}
      />

      <div className="w-full max-w-md space-y-6 text-center relative">
        <CustomerPaymentInvitation />
        <div className="relative mx-auto h-32 w-32 select-none">
          <EntryPassGlobe />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.35em] text-gold">VAULT ENTRY PASS</p>
          <h1 className="font-display text-3xl font-bold">{offer ? `$${price} / YEAR` : "CHECKING YOUR ENTRY OFFER…"}</h1>
          {price === 10 && <p className="text-sm text-gold">Founding customer rate · $10 yearly for life</p>}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {ENTRY_SUMMARY}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 text-left space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground tracking-wider">WHAT THE PASS COVERS</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span>365 days of unlimited browsing across both Vaults</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <span>Follow, heart and request creators for a full year</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Bit-Tokens to unlock creators are bought separately. Standard vault earnings use 90/10 of the $20 token value; founding, VIP and annual-award rates vary.</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-xs font-bold">
            <span className="text-muted-foreground">Your entry pass</span>
            <span className="text-primary">${price}.00 / year</span>
          </div>
        </div>

        <Button variant="neon" disabled={!offer?.open} className="w-full font-bold tracking-wider" onClick={() => setOpen(true)}>
          {`GET MY ENTRY PASS — $${price}`}
        </Button>

        <a href="/pricing" className="block text-[11px] font-semibold uppercase text-primary underline">
          SEE FULL PRICING
        </a>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          The pass is an immediate digital license — all sales final once activated. Questions? admin@dttmediallc.com
        </p>
      </div>

      {open && (
        <BuyTokensModal
          mode="entry_pass"
          onClose={() => setOpen(false)}
          onPurchase={() => {
            setOpen(false);
            onPurchased();
          }}
        />
      )}
    </div>
  );
};

export default EntryPassGate;
