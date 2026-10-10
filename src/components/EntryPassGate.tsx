import { useState } from "react";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuyTokensModal from "@/components/BuyTokensModal";
import { ENTRY_PASS_PRICE_USD } from "@/lib/tokenEconomy";

const EntryPassGate = ({ onPurchased }: { onPurchased: () => void }) => {
  const [open, setOpen] = useState(false);

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
        <p className="font-display text-3xl font-bold tracking-[0.35em] text-primary select-none">DTT</p>

        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.35em] text-gold">VAULT ENTRY PASS</p>
          <h1 className="font-display text-3xl font-bold tracking-wider">${ENTRY_PASS_PRICE_USD} / YEAR</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your annual key to the floor. Browse the full teaser feed, discover every creator, and step into any Vault Hub.
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
            <span>Bit-Tokens to unlock creators are bought separately — creators keep 90%</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3 text-xs font-bold">
            <span className="text-muted-foreground">Your entry pass</span>
            <span className="text-primary">${ENTRY_PASS_PRICE_USD}.00 / year</span>
          </div>
        </div>

        <Button variant="neon" className="w-full font-bold tracking-wider" onClick={() => setOpen(true)}>
          GET MY ENTRY PASS — ${ENTRY_PASS_PRICE_USD}
        </Button>

        <a href="/pricing" className="block text-[11px] font-semibold uppercase text-primary underline">
          SEE FULL PRICING
        </a>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          The pass is an immediate digital license — all sales final once activated. Questions? dropthatthingmedia@gmail.com
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
