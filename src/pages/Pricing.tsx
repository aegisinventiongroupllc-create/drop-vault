import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalFooter from "@/components/LegalFooter";
import {
  TOKEN_INVOICE_USD,
  BUNDLE_TOKENS,
  BUNDLE_INVOICE_USD,
  CREATOR_SPLIT_PERCENT,
} from "@/lib/tokenEconomy";

const plans = [
  { name: "1 Bit-Token", price: TOKEN_INVOICE_USD, note: "Unlock one creator vault for 14 days." },
  { name: `${BUNDLE_TOKENS} Bit-Tokens`, price: BUNDLE_INVOICE_USD, note: `Unlock up to ${BUNDLE_TOKENS} vaults for 14 days each.`, best: true },
];

const faqs = [
  ["What does a coin do?", "One Bit-Token unlocks a creator's full vault for 14 days. Access locks after 14 days unless you renew."],
  ["How do I pay?", "Checkout is in crypto (Litecoin and other coins) through our secure payment partner. Credit and debit cards are coming soon."],
  ["When do coins show up?", "As soon as your payment confirms on the network, coins appear in your vault on your dashboard."],
  ["Where does my money go?", `${CREATOR_SPLIT_PERCENT}% goes directly to the creator you support.`],
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
        <p className="text-sm text-muted-foreground">Simple coins. No subscriptions. No hidden fees.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div key={p.name} className={`relative rounded-2xl border-2 p-5 bg-card ${p.best ? "border-primary neon-glow-sm" : "border-border"}`}>
            {p.best && <span className="absolute top-0 right-0 rounded-bl-lg bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">BEST VALUE</span>}
            <p className="font-semibold">{p.name}</p>
            <p className="mt-2 text-3xl font-bold text-primary">${p.price}</p>
            <p className="mt-2 text-xs text-muted-foreground">{p.note}</p>
          </div>
        ))}
      </div>

      <Button asChild className="w-full font-bold tracking-wider">
        <Link to="/?buy=1">FILL YOUR VAULT</Link>
      </Button>

      <section className="space-y-4">
        {faqs.map(([q, a]) => (
          <div key={q}>
            <h2 className="text-sm font-bold">{q}</h2>
            <p className="text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </section>
    </div>
    <LegalFooter />
  </div>
);

export default Pricing;
