import { useState } from "react";
import { X, Loader2, CreditCard, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRequestTokens, TOKEN_VALUE_USD } from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";

const TIERS = [
  { label: "Standard", price: 500, delivery: "7 days", description: "Basic custom media piece" },
  { label: "Premium", price: 1000, delivery: "5 days", description: "High-quality custom content with revisions" },
  { label: "Exclusive", price: 2500, delivery: "3 days", description: "Priority production with unlimited revisions" },
  { label: "Ultra VIP", price: 5000, delivery: "48 hours", description: "Top-tier bespoke commission with direct collaboration" },
  { label: "Legendary", price: 10001, delivery: "24 hours", description: "Ultimate bespoke experience with direct 1-on-1 session" },
];

const CustomRequestModal = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm" | "buy" | "processing" | "success">("select");
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ pay_address?: string; pay_amount?: number; pay_currency?: string; payment_id?: string; invoice_url?: string } | null>(null);

  const tier = selectedTier !== null ? TIERS[selectedTier] : null;
  const activePrice = tier?.price ?? 0;
  const tokenCalc = calculateRequestTokens(activePrice);

  const handleCryptoPay = async (currency: string) => {
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          amount_usd: activePrice,
          tokens: tokenCalc.total,
          pay_currency: currency,
          order_id: `dtt-req-${creatorName}-${Date.now()}`,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPaymentInfo({
        pay_address: data.pay_address,
        pay_amount: data.pay_amount,
        pay_currency: data.pay_currency,
        payment_id: data.payment_id,
      });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Payment failed.");
      setStep("buy");
    }
  };

  const handleCardPay = async () => {
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          amount_usd: activePrice,
          tokens: tokenCalc.total,
          order_id: `dtt-req-${creatorName}-${Date.now()}`,
          is_fiat: true,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.invoice_url) {
        window.open(data.invoice_url, "_blank");
      }
      setPaymentInfo({ invoice_url: data?.invoice_url });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Card payment failed.");
      setStep("buy");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">CUSTOM REQUEST</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── STEP 1: Select Tier ─── */}
        {step === "select" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a tier for <span className="text-foreground font-medium">@{creatorName}</span>
            </p>
            {TIERS.map((t, i) => {
              const calc = calculateRequestTokens(t.price);
              return (
                <button
                  key={t.label}
                  onClick={() => { setSelectedTier(i); setStep("details"); }}
                  className={`w-full text-left bg-secondary/50 border rounded-xl p-4 transition-all hover:border-primary/50 ${
                    selectedTier === i ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">{t.label}</span>
                    <div className="text-right">
                      <span className="text-primary font-bold">${t.price}</span>
                      <p className="text-[10px] text-muted-foreground">{calc.total} Request-Tokens</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── STEP 2: Describe Request ─── */}
        {step === "details" && (
          <div className="p-4 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{tier?.label}</p>
                <p className="text-xs text-muted-foreground">Delivery: {tier?.delivery}</p>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-lg">${activePrice}</span>
                <p className="text-xs text-muted-foreground">{tokenCalc.total} RT</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Describe your request</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the custom media you'd like..."
                className="w-full h-32 bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>BACK</Button>
              <Button variant="neon" className="flex-1" disabled={!description.trim()} onClick={() => setStep("confirm")}>
                REVIEW
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Confirm ─── */}
        {step === "confirm" && (
          <div className="p-4 space-y-4 text-center">
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">CONFIRM REQUEST</h3>

            <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creator</span>
                <span className="text-foreground font-medium">@{creatorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tier</span>
                <span className="text-foreground font-medium">{tier?.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="text-foreground font-medium">{tokenCalc.baseTokens} RT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-primary font-medium">+{tokenCalc.fee} RT</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-lg">{tokenCalc.total} Request-Tokens</span>
              </div>
            </div>

            {/* CTA — This request requires tokens */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">
                This request requires <span className="text-primary">{tokenCalc.total} Request-Tokens</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Purchase tokens below to submit your request to @{creatorName}.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>BACK</Button>
              <Button variant="neon" className="flex-1" onClick={() => setStep("buy")}>
                BUY TOKENS & SUBMIT
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Buy Request-Tokens ─── */}
        {step === "buy" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center">BUY REQUEST-TOKENS</h3>

            {/* Token requirement banner */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">THIS REQUEST REQUIRES</p>
              <p className="text-2xl font-bold text-primary">{tokenCalc.total} Request-Tokens</p>
              <p className="text-xs text-muted-foreground mt-1">= ${activePrice} USD</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Card — Banxa Widget */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">PAY WITH CARD (BANXA)</p>
              <button
                onClick={handleCardPay}
                className="w-full bg-secondary border-2 border-primary/40 rounded-xl p-4 text-center hover:border-primary transition-all neon-glow-sm"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <p className="text-sm font-bold text-foreground">CREDIT / DEBIT CARD</p>
                </div>
                <p className="text-xs text-primary font-semibold">
                  Buy {tokenCalc.total} Request-Tokens for ${activePrice}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Visa / MC / Apple Pay — Card → LTC → Tokens
                </p>
              </button>
            </div>

            {/* Crypto — Direct */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">OR PAY WITH CRYPTO</p>
              <div className="grid grid-cols-3 gap-2">
                {["ltc", "btc", "eth"].map((coin) => (
                  <button
                    key={coin}
                    onClick={() => handleCryptoPay(coin)}
                    className="bg-secondary border border-border rounded-xl p-3 text-center hover:border-primary/50 transition-all"
                  >
                    <Coins className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{coin.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                All payments settle in <span className="text-primary font-bold">LTC (Litecoin)</span>.
                Your card is charged → Banxa sends LTC to our wallet → Tokens are credited instantly.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => { setStep("confirm"); setError(null); }}>
              BACK
            </Button>
          </div>
        )}

        {/* ─── Processing ─── */}
        {step === "processing" && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">PROCESSING</h3>
            <p className="text-sm text-muted-foreground">Creating payment & reserving your request…</p>
          </div>
        )}

        {/* ─── Success ─── */}
        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">REQUEST SUBMITTED</h3>
            <p className="text-sm text-muted-foreground">
              {tokenCalc.total} Request-Tokens spent on @{creatorName}'s {tier?.label} tier.
            </p>

            {paymentInfo?.pay_address && (
              <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  Send <span className="text-primary font-bold">{paymentInfo.pay_amount} {paymentInfo.pay_currency?.toUpperCase()}</span> to:
                </p>
                <p className="text-[10px] text-foreground font-mono break-all">{paymentInfo.pay_address}</p>
              </div>
            )}

            {paymentInfo?.invoice_url && (
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-2">
                  Complete your card payment in the window that opened.
                </p>
                <a
                  href={paymentInfo.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline"
                >
                  Open payment page again
                </a>
              </div>
            )}

            <Button variant="neon" className="w-full" onClick={onClose}>DONE</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomRequestModal;
