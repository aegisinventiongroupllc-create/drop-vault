import { useState } from "react";
import { X, Loader2, CreditCard, Coins, MessageSquare, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRequestTokens, TOKEN_VALUE_USD, ADMIN_FEE_USD, TOKEN_BASE_VALUE_USD } from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";

const TIERS = [
  { label: "Standard", price: 500, delivery: "7 days", description: "Basic custom media piece" },
  { label: "Premium", price: 1000, delivery: "5 days", description: "High-quality custom content with revisions" },
  { label: "Exclusive", price: 2500, delivery: "3 days", description: "Priority production with unlimited revisions" },
  { label: "Ultra VIP", price: 5000, delivery: "48 hours", description: "Top-tier bespoke commission with direct collaboration" },
  { label: "Legendary", price: 10001, delivery: "24 hours", description: "Ultimate bespoke experience with direct 1-on-1 session" },
];

const MAX_TOKENS = 500; // 500 BT = $10,001 ceiling
const MIN_CUSTOM_BID_TOKENS = 1;

const CustomRequestModal = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [customBidTokens, setCustomBidTokens] = useState("");
  const [useCustomBid, setUseCustomBid] = useState(false);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm" | "buy" | "processing" | "success" | "counter" | "counter-accept">("select");
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ pay_address?: string; pay_amount?: number; pay_currency?: string; payment_id?: string; invoice_url?: string } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const logConsent = async (method: "card" | "crypto", currency?: string) => {
    try {
      let ip = "unknown";
      try {
        const r = await fetch("https://api.ipify.org?format=json");
        ip = (await r.json()).ip;
      } catch {}
      await supabase.from("legal_consents").insert({
        ip_address: ip,
        user_agent: navigator.userAgent,
        terms_version: "2.0",
        consent_text: `[CUSTOM-REQUEST] @${creatorName} via ${method}${currency ? ` (${currency.toUpperCase()})` : ""} — agreed to Terms, Privacy, Refund, AML/KYC, Risk Disclosure.`,
        consent_type: "checkout_consent",
      });
    } catch {}
  };

  // Counter-offer state
  const [counterOffer, setCounterOffer] = useState<{ tokens: number; message: string } | null>(null);

  const tier = selectedTier !== null ? TIERS[selectedTier] : null;

  // Calculate price based on custom bid or tier
  const bidTokens = useCustomBid ? Math.min(Number(customBidTokens) || 0, MAX_TOKENS) : null;
  const activePrice = useCustomBid
    ? (bidTokens ?? 0) * TOKEN_BASE_VALUE_USD
    : (tier?.price ?? 0);
  const tokenCalc = calculateRequestTokens(activePrice);

  const handleCryptoPay = async (currency: string) => {
    if (!consentChecked) { setError("Please confirm you agree to the policies before paying."); return; }
    await logConsent("crypto", currency);
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          amount_usd: activePrice + ADMIN_FEE_USD,
          tokens: tokenCalc.total,
          pay_currency: currency,
          order_id: `dtt-req-${creatorName}-${Date.now()}`,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setPaymentInfo({ pay_address: data.pay_address, pay_amount: data.pay_amount, pay_currency: data.pay_currency, payment_id: data.payment_id });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Payment failed.");
      setStep("buy");
    }
  };

  const handleCardPay = async () => {
    if (!consentChecked) { setError("Please confirm you agree to the policies before paying."); return; }
    await logConsent("card");
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: {
          amount_usd: activePrice + ADMIN_FEE_USD,
          tokens: tokenCalc.total,
          order_id: `dtt-req-${creatorName}-${Date.now()}`,
          is_fiat: true,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.invoice_url) window.open(data.invoice_url, "_blank");
      setPaymentInfo({ invoice_url: data?.invoice_url });
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Card payment failed.");
      setStep("buy");
    }
  };

  // Simulate receiving a counter-offer from creator
  const simulateCounterOffer = () => {
    setCounterOffer({
      tokens: Math.ceil((bidTokens ?? tokenCalc.baseTokens) * 1.3),
      message: "I'd love to do this! However, this type of content requires more production time. Here's my counter.",
    });
    setStep("counter");
  };

  const acceptCounter = () => {
    if (counterOffer) {
      setCustomBidTokens(String(counterOffer.tokens));
      setUseCustomBid(true);
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

        {/* ─── STEP 1: Select Tier or Custom Bid ─── */}
        {step === "select" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a tier or enter a custom bid for <span className="text-foreground font-medium">@{creatorName}</span>
            </p>

            {/* Custom Bid Section */}
            <div className="bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-4 h-4 text-gold" />
                <span className="text-xs font-bold tracking-wider text-gold">CUSTOM BID</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Enter any Bit-Token amount (max {MAX_TOKENS} BT = ${MAX_TOKENS * TOKEN_BASE_VALUE_USD})</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={MIN_CUSTOM_BID_TOKENS}
                  max={MAX_TOKENS}
                  value={customBidTokens}
                  onChange={(e) => {
                    setCustomBidTokens(e.target.value);
                    setUseCustomBid(true);
                    setSelectedTier(null);
                  }}
                  placeholder="e.g. 50"
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                <Button
                  variant="gold"
                  size="sm"
                  disabled={!customBidTokens || Number(customBidTokens) < MIN_CUSTOM_BID_TOKENS}
                  onClick={() => { setUseCustomBid(true); setStep("details"); }}
                >
                  BID
                </Button>
              </div>
              {customBidTokens && Number(customBidTokens) > 0 && (
                <p className="text-[10px] text-gold mt-1">
                  = ${Math.min(Number(customBidTokens), MAX_TOKENS) * TOKEN_BASE_VALUE_USD} USD + $1 DTT Fee
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground font-bold tracking-wider">OR SELECT A TIER</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {TIERS.map((t, i) => {
              const calc = calculateRequestTokens(t.price);
              return (
                <button
                  key={t.label}
                  onClick={() => { setSelectedTier(i); setUseCustomBid(false); setStep("details"); }}
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
                <p className="font-semibold text-foreground">{useCustomBid ? "Custom Bid" : tier?.label}</p>
                <p className="text-xs text-muted-foreground">
                  {useCustomBid ? `${bidTokens} Bit-Tokens` : `Delivery: ${tier?.delivery}`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-lg">${activePrice}</span>
                <p className="text-[10px] text-muted-foreground">DTT Flat Fee: ${ADMIN_FEE_USD}</p>
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
                <span className="text-muted-foreground">{useCustomBid ? "Custom Bid" : "Tier"}</span>
                <span className="text-foreground font-medium">{useCustomBid ? `${bidTokens} BT` : tier?.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="text-foreground font-medium">${activePrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">DTT Flat Fee</span>
                <span className="text-gold font-medium">+${ADMIN_FEE_USD}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-lg">${activePrice + ADMIN_FEE_USD}</span>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">
                Submit this request to <span className="text-primary">@{creatorName}</span>?
              </p>
              <p className="text-xs text-muted-foreground">
                The creator can accept, decline, or send a counter-offer with a different price.
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

        {/* ─── Counter-Offer from Creator ─── */}
        {step === "counter" && counterOffer && (
          <div className="p-4 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">COUNTER-OFFER</h3>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">@{creatorName}</span> sent a counter-offer:
            </p>

            <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 space-y-3">
              <p className="text-sm text-foreground italic">"{counterOffer.message}"</p>
              <div className="flex justify-between items-center bg-secondary/50 rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Your bid:</span>
                <span className="text-sm text-muted-foreground line-through">{bidTokens || tokenCalc.baseTokens} BT</span>
              </div>
              <div className="flex justify-between items-center bg-primary/10 rounded-lg p-3">
                <span className="text-sm font-bold text-foreground">Counter price:</span>
                <span className="text-lg font-bold text-primary">{counterOffer.tokens} BT</span>
              </div>
              <p className="text-xs text-muted-foreground">
                = ${counterOffer.tokens * TOKEN_BASE_VALUE_USD} USD + $1 DTT Fee
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>DECLINE</Button>
              <Button variant="neon" className="flex-1" onClick={acceptCounter}>
                ACCEPT & PAY
              </Button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Buy Request-Tokens ─── */}
        {step === "buy" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center">BUY REQUEST-TOKENS</h3>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">TOTAL DUE</p>
              <p className="text-2xl font-bold text-primary">${activePrice + ADMIN_FEE_USD}</p>
              <p className="text-xs text-muted-foreground mt-1">${activePrice} base + ${ADMIN_FEE_USD} DTT Fee</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">CARD — SECURE FIAT ON-RAMP · SETTLES IN LTC</p>
              <button
                onClick={handleCardPay}
                disabled={!consentChecked}
                className="w-full bg-secondary border-2 border-primary/40 rounded-xl p-4 text-center hover:border-primary transition-all neon-glow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <p className="text-sm font-bold text-foreground">CREDIT / DEBIT CARD</p>
                </div>
                <p className="text-xs text-primary font-semibold">Pay ${activePrice + ADMIN_FEE_USD}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Visa / MC / Apple Pay · KYC may be required</p>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">OR PAY WITH CRYPTO</p>
              <div className="grid grid-cols-3 gap-2">
                {["ltc", "btc", "eth"].map((coin) => (
                  <button
                    key={coin}
                    onClick={() => handleCryptoPay(coin)}
                    disabled={!consentChecked}
                    className="bg-secondary border border-border rounded-xl p-3 text-center hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Coins className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold text-foreground">{coin.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 text-center space-y-1">
              <p className="text-[10px] text-muted-foreground">
                All payments settle in <span className="text-primary font-bold">LTC (Litecoin)</span>.
                DTT Flat Fee: <span className="text-gold font-bold">$1.00</span>. Network & processor fees apply.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Crypto values are volatile and transactions are <span className="text-foreground font-bold">irreversible</span>. All sales final — see Refund Policy.
              </p>
            </div>

            <label className="flex items-start gap-2 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                I confirm I am 18+, the funds are mine and lawful, and I have read and accept the
                <span className="text-foreground font-semibold"> Terms, Privacy, Refund, AML/KYC, and Risk Disclosure</span> policies.
              </span>
            </label>

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
              Your request has been sent to @{creatorName}. They can accept, decline, or counter-offer.
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
                <p className="text-[10px] text-muted-foreground mb-2">Complete your card payment in the window that opened.</p>
                <a href={paymentInfo.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
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
