import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TOKEN_INVOICE_USD, TOKEN_BASE_VALUE_USD,
  BUNDLE_TOKENS, BUNDLE_INVOICE_USD, BUNDLE_BASE_USD,
  PLATFORM_SPLIT_PERCENT, CREATOR_SPLIT_PERCENT,
  calculateTokenPurchaseSplit,
} from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";

const FINAL_SALE_TEXT = "I agree that purchasing Bit-Tokens grants an immediate digital license. All sales are final and non-refundable once tokens are credited to my account.";

interface BuyTokensModalProps {
  onClose: () => void;
  onPurchase: (tokens: number) => void;
  mode?: "tokens" | "entry_pass";
}

interface Checkout {
  invoice_id: string;
  invoice_url: string;
  order_id: string;
}

const BuyTokensModal = ({ onClose, onPurchase, mode = "tokens" }: BuyTokensModalProps) => {
  const isEntryPass = mode === "entry_pass";
  const [selectedOption, setSelectedOption] = useState<"single" | "bundle">("bundle");
  const [step, setStep] = useState<"select" | "payment" | "processing" | "awaiting" | "success">("select");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [finalSaleChecked, setFinalSaleChecked] = useState(false);
  const allAgreed = consentChecked && finalSaleChecked;
  const [creditedTokens, setCreditedTokens] = useState<number>(0);
  const pollRef = useRef<number | null>(null);
  const [cardEnabled, setCardEnabled] = useState(false);
  const [rememberCard, setRememberCard] = useState(false);

  // Card checkout appears automatically once CCBill account keys are configured on the server.
  useEffect(() => {
    supabase.functions.invoke("ccbill-create-checkout", { body: { probe: true } })
      .then(({ data }) => setCardEnabled(Boolean(data?.configured)))
      .catch(() => setCardEnabled(false));
  }, []);

  const handleCardCheckout = async () => {
    if (!allAgreed) { setError("Please confirm you agree to the policies before paying."); return; }
    await logConsent();
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("ccbill-create-checkout", {
      body: { package: isEntryPass ? "entry_pass" : selectedOption, savecard: rememberCard },
    });
    if (fnError || !data?.checkout_url) {
      setError(fnError ? await readFunctionError(fnError) : "Card checkout failed. Please try again.");
      return;
    }
    window.location.href = data.checkout_url;
  };

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
        .channel(`cc-credit-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: isEntryPass ? "entry_passes" : "token_purchases", filter: `user_id=eq.${uid}` },
          (payload: any) => {
            const credited = isEntryPass ? 0 : (payload?.new?.tokens_credited ?? tokens);
            setCreditedTokens(credited);
            setStep("success");
            onPurchase(credited);
            toast.success("Payment confirmed!", { description: `${credited} Bit-Tokens added.` });
          }
        )
        .subscribe();
    })();

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
        consent_text: `[CHECKOUT] Agreed to Terms, Privacy, Refund, AML/KYC, Risk Disclosure. ${FINAL_SALE_TEXT}`,
        consent_type: "checkout_consent",
      });
    } catch {}
  };

  // Edge functions that return a non-2xx status give a generic message — dig out the real one.
  const readFunctionError = async (fnError: any): Promise<string> => {
    try {
      const res = fnError?.context;
      if (res && typeof res.json === "function") {
        const body = await res.clone().json();
        if (body?.error) return String(body.error);
      }
    } catch {}
    return fnError?.message || "Checkout failed. Please try again.";
  };

  const handleStartCheckout = async () => {
    if (!allAgreed) { setError("Please confirm you agree to the policies before paying."); return; }
    await logConsent();
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("cryptocloud-create-invoice", {
        body: { kind: isEntryPass ? "entry_pass" : "token_package", package: selectedOption === "bundle" ? "bundle" : "single" },
      });
      if (fnError) throw new Error(await readFunctionError(fnError));
      if (data?.error) throw new Error(data.error);
      setCheckout(data as Checkout);
      setStep("awaiting");
      // Open the hosted CryptoCloud checkout in a new tab
      window.open((data as Checkout).invoice_url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setError(err.message || "Checkout failed. Please try again.");
      setStep("payment");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center overscroll-contain">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button type="button" variant="ghost" size="sm" className="gap-2 px-2" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
            GO BACK TO DASHBOARD
          </Button>
          <h2 className="text-sm font-bold text-foreground font-display tracking-wider">{isEntryPass ? "VAULT ENTRY PASS" : "BUY COINS"}</h2>
          <a href="/pricing" className="text-[10px] font-semibold uppercase text-primary underline">Pricing</a>
        </div>

        {step === "select" && isEntryPass && (
          <div className="p-4 space-y-3">
            <div className="rounded-xl p-4 border-2 border-primary bg-primary/5 neon-glow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">E</span>
                  <span className="font-semibold text-foreground">Vault Entry Pass — 1 Year</span>
                </div>
                <span className="text-lg font-bold text-primary">$20</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">
                One pass covers the discovery floor for 365 days. Bit-Tokens to unlock creators are bought separately.
              </p>
            </div>

            <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider">WHERE YOUR $20 GOES</p>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">DTT platform vault (entry fee)</span><span className="text-primary font-bold">$20.00</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Creators earn from Bit-Token unlocks</span><span className="text-foreground">90% of every token</span></div>
            </div>

            <Button variant="neon" className="w-full mt-4" onClick={() => setStep("payment")}>CONTINUE TO PAYMENT</Button>
          </div>
        )}

        {step === "select" && !isEntryPass && (
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
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center mb-2">PAY WITH CRYPTO</h3>
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 text-center neon-glow-sm">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider mb-1">PAYMENT METHOD</p>
              <p className="text-2xl font-bold text-primary">LTC · BTC · ETH · USDT</p>
              <p className="text-[10px] text-muted-foreground mt-1">Secure hosted checkout via CryptoCloud</p>
            </div>

            {cardEnabled ? (
              <Button variant="outline" className="w-full" disabled={!allAgreed} onClick={handleCardCheckout}>
                PAY WITH CARD (CCBILL)
              </Button>
            ) : (
              <div className="bg-secondary/30 border border-dashed border-border rounded-xl p-3 text-center opacity-70">
                <p className="text-sm font-bold text-muted-foreground">CREDIT / DEBIT CARD</p>
                <p className="text-[10px] text-gold font-bold tracking-wider">COMING SOON</p>
              </div>
            )}

            {cardEnabled && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberCard}
                  onChange={(e) => setRememberCard(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-[10px] text-muted-foreground leading-relaxed">
                  Remember my card for future purchases (optional). Your card is stored securely by our payment processor — never on DTT servers.
                </span>
              </label>
            )}

            <div className="bg-secondary/50 border border-border rounded-lg p-3 text-center space-y-1">
              <p className="text-[10px] text-muted-foreground">You'll be redirected to CryptoCloud's secure checkout to complete payment.</p>
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

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={finalSaleChecked}
                onChange={(e) => setFinalSaleChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                {FINAL_SALE_TEXT}
              </span>
            </label>

            <Button variant="neon" className="w-full" disabled={!allAgreed} onClick={handleStartCheckout}>GENERATE PAYMENT</Button>
            <Button variant="outline" className="w-full" onClick={() => { setStep("select"); setError(null); }}>BACK</Button>
          </div>
        )}

        {step === "processing" && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">GENERATING CHECKOUT</h3>
            <p className="text-sm text-muted-foreground">Creating your secure invoice…</p>
          </div>
        )}

        {step === "awaiting" && checkout && (
          <div className="p-5 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mx-auto">
              <ExternalLink className="w-8 h-8 text-gold" />
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">COMPLETE YOUR PAYMENT</h3>
            <p className="text-xs text-muted-foreground">
              Your secure CryptoCloud checkout opened in a new tab. Pay there and your {isEntryPass ? "pass will activate" : "tokens will credit"} automatically. You can keep this window open.
            </p>

            <a href={checkout.invoice_url} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="neon" className="w-full">OPEN CHECKOUT AGAIN</Button>
            </a>

            <div className="bg-gold/5 border border-gold/20 rounded-lg p-3">
              <p className="text-[10px] text-gold font-bold tracking-wider mb-1">⚡ AUTO-VERIFICATION</p>
              <p className="text-[10px] text-muted-foreground">
                Tokens credit automatically as soon as CryptoCloud confirms your payment. Invoice expires in 2 hours.
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
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">
              {isEntryPass ? "VAULT ENTRY PASS ACTIVE!" : "PAYMENT RECEIVED!"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEntryPass
                ? "Your Vault Entry Pass is active for a full year. Welcome to the floor."
                : (
                  <>
                    Your <span className="text-primary font-bold">{creditedTokens} Bit-Token{creditedTokens !== 1 ? "s" : ""}</span> have been added to your vault.
                  </>
                )}
            </p>
            <Button variant="neon" className="w-full" onClick={onClose}>{isEntryPass ? "ENTER THE VAULT" : "BACK TO VAULT"}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyTokensModal;
