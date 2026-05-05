import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X, Loader2, Clock, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TOKEN_INVOICE_USD, TOKEN_BASE_VALUE_USD,
  BUNDLE_TOKENS, BUNDLE_INVOICE_USD, BUNDLE_BASE_USD,
  PLATFORM_SPLIT_PERCENT, CREATOR_SPLIT_PERCENT,
  calculateTokenPurchaseSplit,
} from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";

interface BuyTokensModalProps {
  onClose: () => void;
  onPurchase: (tokens: number) => void;
}

interface Checkout {
  payment_id: string;
  ltc_address: string;
  ltc_amount: number;
  ltc_price_usd: number;
  expires_at: string;
}

const BuyTokensModal = ({ onClose, onPurchase }: BuyTokensModalProps) => {
  const [selectedOption, setSelectedOption] = useState<"single" | "bundle">("bundle");
  const [step, setStep] = useState<"select" | "payment" | "processing" | "awaiting" | "success">("select");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [creditedTokens, setCreditedTokens] = useState<number>(0);
  const pollRef = useRef<number | null>(null);

  const tokens = selectedOption === "bundle" ? BUNDLE_TOKENS : 1;
  const invoiceAmount = selectedOption === "bundle" ? BUNDLE_INVOICE_USD : TOKEN_INVOICE_USD;
  const split = calculateTokenPurchaseSplit(invoiceAmount, tokens);

  // Poll the verifier + listen for token_purchases insert as soon as we're awaiting
  useEffect(() => {
    if (step !== "awaiting" || !checkout) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid || cancelled) return;

      channel = supabase
        .channel(`ltc-credit-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "token_purchases", filter: `user_id=eq.${uid}` },
          (payload: any) => {
            const credited = payload?.new?.tokens_credited ?? tokens;
            setCreditedTokens(credited);
            setStep("success");
            onPurchase(credited);
            toast.success("Payment confirmed!", { description: `${credited} Bit-Tokens added.` });
          }
        )
        .subscribe();
    })();

    // Poll the verifier every 25s
    const tick = () => {
      supabase.functions.invoke("ltc-verify-payment", {
        body: { payment_id: checkout.payment_id },
      }).catch(() => {});
    };
    tick();
    pollRef.current = window.setInterval(tick, 25000);

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [step, checkout, tokens, onPurchase]);

  const logConsent = async () => {
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
        consent_text: "[CHECKOUT] Buy Tokens via LTC — agreed to Terms, Privacy, Refund, AML/KYC, Risk Disclosure.",
        consent_type: "checkout_consent",
      });
    } catch {}
  };

  const handleStartCheckout = async () => {
    if (!consentChecked) { setError("Please confirm you agree to the policies before paying."); return; }
    await logConsent();
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("ltc-create-checkout", {
        body: { amount_usd: invoiceAmount, tokens },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setCheckout(data as Checkout);
      setStep("awaiting");
    } catch (err: any) {
      setError(err.message || "Checkout failed. Please try again.");
      setStep("payment");
    }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center overscroll-contain">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">BUY TOKENS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            <button
              onClick={() => setSelectedOption("single")}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all ${selectedOption === "single" ? "border-primary bg-primary/5" : "border-border bg-secondary/50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                  <span className="font-semibold text-foreground">1 Bit-Token</span>
                </div>
                <span className="text-lg font-bold text-primary">${TOKEN_INVOICE_USD}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">$1 platform fee + ${TOKEN_BASE_VALUE_USD} base</p>
            </button>

            <button
              onClick={() => setSelectedOption("bundle")}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all relative overflow-hidden ${selectedOption === "bundle" ? "border-primary bg-primary/5 neon-glow-sm" : "border-border bg-secondary/50"}`}
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">BEST VALUE</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                  <span className="font-semibold text-foreground">{BUNDLE_TOKENS} Bit-Tokens</span>
                </div>
                <span className="text-lg font-bold text-primary">${BUNDLE_INVOICE_USD}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">$1 platform fee + ${BUNDLE_BASE_USD} base</p>
            </button>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider">REVENUE BREAKDOWN</p>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Admin Fee</span><span className="text-primary font-bold">${split.adminFee.toFixed(2)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Platform ({PLATFORM_SPLIT_PERCENT}%)</span><span className="text-foreground">${split.platformShare.toFixed(2)}</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Creator ({CREATOR_SPLIT_PERCENT}%)</span><span className="text-foreground">${split.creatorShare.toFixed(2)}</span></div>
              <div className="flex justify-between text-[10px] border-t border-border pt-1 font-bold"><span className="text-muted-foreground">Your Total Revenue</span><span className="text-primary">${split.totalPlatformRevenue.toFixed(2)}</span></div>
            </div>

            <Button variant="neon" className="w-full mt-4" onClick={() => setStep("payment")}>CONTINUE TO PAYMENT</Button>
          </div>
        )}

        {step === "payment" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center mb-2">PAY WITH LITECOIN (LTC)</h3>
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 text-center neon-glow-sm">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider mb-1">PAYMENT METHOD</p>
              <p className="text-2xl font-bold text-primary">LTC</p>
              <p className="text-[10px] text-muted-foreground mt-1">Litecoin — fast & low fees</p>
            </div>

            <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-3 text-center opacity-70">
              <p className="text-sm font-bold text-muted-foreground">CREDIT / DEBIT CARD</p>
              <p className="text-[10px] text-gold font-bold tracking-wider">COMING SOON</p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 text-center space-y-1">
              <p className="text-[10px] text-muted-foreground">All payments settle directly to our LTC wallet. Network fees apply.</p>
              <p className="text-[10px] text-muted-foreground">Crypto transactions are <span className="text-foreground font-bold">irreversible</span>. All sales final.</p>
            </div>

            <label className="flex items-start gap-2 bg-secondary/40 border border-border rounded-lg p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                I confirm I am 18+, the funds are mine and lawful, and I accept the
                <span className="text-foreground font-semibold"> Terms, Privacy, Refund, AML/KYC, and Risk Disclosure</span> policies.
                I understand crypto transactions are <span className="text-foreground font-semibold">irreversible</span>.
              </span>
            </label>

            <Button variant="neon" className="w-full" disabled={!consentChecked} onClick={handleStartCheckout}>GENERATE PAYMENT</Button>
            <Button variant="outline" className="w-full" onClick={() => { setStep("select"); setError(null); }}>BACK</Button>
          </div>
        )}

        {step === "processing" && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">GENERATING CHECKOUT</h3>
            <p className="text-sm text-muted-foreground">Fetching live LTC rate…</p>
          </div>
        )}

        {step === "awaiting" && checkout && (
          <div className="p-5 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">SEND LITECOIN</h3>
            <p className="text-xs text-muted-foreground">
              Send the <span className="text-foreground font-bold">exact</span> amount below. Tokens credit automatically once the transaction appears on the Litecoin network.
            </p>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-3 text-left">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-1">SEND EXACTLY</p>
                <div className="flex items-center justify-between bg-background/50 rounded p-2 border border-border">
                  <p className="text-base font-bold text-primary font-mono">{checkout.ltc_amount.toFixed(8)} LTC</p>
                  <button onClick={() => copy(checkout.ltc_amount.toFixed(8))} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">≈ ${invoiceAmount} USD @ ${checkout.ltc_price_usd.toFixed(2)}/LTC</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-muted-foreground tracking-wider mb-1">TO ADDRESS</p>
                <div className="flex items-start justify-between gap-2 bg-background/50 rounded p-2 border border-border">
                  <p className="text-[10px] text-foreground font-mono break-all">{checkout.ltc_address}</p>
                  <button onClick={() => copy(checkout.ltc_address)} className="text-muted-foreground hover:text-foreground shrink-0"><Copy className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex justify-center pt-1">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`litecoin:${checkout.ltc_address}?amount=${checkout.ltc_amount.toFixed(8)}`)}`}
                  alt="LTC QR Code"
                  className="rounded border border-border bg-background p-1"
                />
              </div>
            </div>

            <div className="bg-gold/5 border border-gold/20 rounded-lg p-3">
              <p className="text-[10px] text-gold font-bold tracking-wider mb-1">⚡ AUTO-VERIFICATION</p>
              <p className="text-[10px] text-muted-foreground">
                We monitor the LTC blockchain every 25 seconds. Tokens credit automatically when your exact-amount payment is detected. Checkout expires in 2 hours.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={onClose}>CLOSE — I'LL CHECK BACK</Button>
          </div>
        )}

        {step === "success" && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">PAYMENT RECEIVED!</h3>
            <p className="text-sm text-muted-foreground">
              Your <span className="text-primary font-bold">{creditedTokens} Bit-Token{creditedTokens !== 1 ? "s" : ""}</span> have been added to your vault.
            </p>
            <Button variant="neon" className="w-full" onClick={onClose}>BACK TO VAULT</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyTokensModal;
