import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalFooter from "@/components/LegalFooter";
import {
  TOKEN_INVOICE_USD,
  BUNDLE_TOKENS,
  BUNDLE_INVOICE_USD,
} from "@/lib/tokenEconomy";

const plans = [
  { name: "1 Bit-Token", price: TOKEN_INVOICE_USD },
  { name: `${BUNDLE_TOKENS} Bit-Tokens`, price: BUNDLE_INVOICE_USD, best: true },
];

const Pricing = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Helmet>
      <title>Pricing — DTT Bit-Tokens</title>
      <meta name="description" content="Simple Bit-Token pricing. One coin unlocks a creator vault for 14 days." />
    </Helmet>
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-8">
      <Button asChild variant="ghost" size="sm" className="gap-2 px-2">
        <Link to="/"><ArrowLeft className="h-4 w-4" /> GO BACK</Link>
      </Button>

      <header className="space-y-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider">PRICING</h1>
        <p className="text-sm text-muted-foreground">Simple coins. No subscriptions. $25 per Bit-Token ($20 token + $5 service fee).</p>
      </header>

      <section className="rounded-2xl border-2 border-primary neon-glow-sm bg-card p-5 space-y-2">
        <p className="text-[10px] font-bold tracking-widest text-gold">VAULT ENTRY PASS</p>
        <p className="text-3xl font-bold text-primary">$20<span className="text-xs text-muted-foreground"> / YEAR</span></p>
        <p className="text-xs text-muted-foreground">
          Required annual entry to the teaser feed and discovery floor. Bit-Tokens to unlock creators are sold separately below.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div key={p.name} className={`relative rounded-2xl border-2 p-5 bg-card ${p.best ? "border-primary neon-glow-sm" : "border-border"}`}>
            {p.best && <span className="absolute top-0 right-0 rounded-bl-lg bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BEST VALUE</span>}
        <p className="font-semibold">{p.name}</p>
            <p className="mt-2 text-3xl font-bold text-primary">${p.price}</p>
          </div>
        ))}
      </div>

      <Button asChild className="w-full font-bold tracking-wider">
        <Link to="/" onClick={() => { sessionStorage.setItem("dtt_active_tab", "vaults"); sessionStorage.setItem("dtt_open_buy", "1"); }}>FILL YOUR VAULT</Link>
      </Button>
    </div>
    <LegalFooter />
  </div>
);

export default Pricing;
