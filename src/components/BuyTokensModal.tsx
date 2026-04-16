import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TOKEN_INVOICE_USD, TOKEN_BASE_VALUE_USD, ADMIN_FEE_USD,
  BUNDLE_TOKENS, BUNDLE_INVOICE_USD, BUNDLE_BASE_USD,
  PLATFORM_SPLIT_PERCENT, CREATOR_SPLIT_PERCENT,
  calculateTokenPurchaseSplit,
} from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";

interface BuyTokensModalProps {
  onClose: () => void;
  onPurchase: (tokens: number) => void;
}

const BuyTokensModal = ({ onClose, onPurchase }: BuyTokensModalProps) => {
  const [selectedOption, setSelectedOption] = useState<"single" | "bundle">("bundle");
  const [step, setStep] = useState<"select" | "payment" | "processing" | "success">("select");
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{ pay_address: string; pay_amount: number; pay_currency: string; payment_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokens = selectedOption === "bundle" ? BUNDLE_TOKENS : 1;
  const invoiceAmount = selectedOption === "bundle" ? BUNDLE_INVOICE_USD : TOKEN_INVOICE_USD;
  const split = calculateTokenPurchaseSplit(invoiceAmount, tokens);

  const handleCryptoPay = async (currency: string) => {
    setSelectedCrypto(currency);
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: { amount_usd: invoiceAmount, tokens, pay_currency: currency, order_id: `dtt-${Date.now()}` },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setPaymentInfo({ pay_address: data.pay_address, pay_amount: data.pay_amount, pay_currency: data.pay_currency, payment_id: data.payment_id });
      setStep("success");
      setTimeout(() => { onPurchase(tokens); onClose(); }, 2500);
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
      setStep("payment");
    }
  };

  const handleCardPay = async () => {
    setStep("processing");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("create-payment", {
        body: { amount_usd: invoiceAmount, tokens, order_id: `dtt-${Date.now()}`, is_fiat: true },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.invoice_url) window.open(data.invoice_url, "_blank");
      setStep("success");
      setTimeout(() => { onPurchase(tokens); onClose(); }, 2500);
    } catch (err: any) {
      setError(err.message || "Card payment failed. Please try again.");
      setStep("payment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">BUY TOKENS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            {/* Single Token */}
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
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">
                $1 platform fee + ${TOKEN_BASE_VALUE_USD} base
              </p>
            </button>

            {/* Bundle */}
            <button
              onClick={() => setSelectedOption("bundle")}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all relative overflow-hidden ${selectedOption === "bundle" ? "border-primary bg-primary/5 neon-glow-sm" : "border-border bg-secondary/50"}`}
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">BEST VALUE</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                  <div>
                    <span className="font-semibold text-foreground">{BUNDLE_TOKENS} Bit-Tokens</span>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">${BUNDLE_INVOICE_USD}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">
                $1 platform fee + ${BUNDLE_BASE_USD} base
              </p>
            </button>

            {/* Revenue breakdown */}
            <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider">REVENUE BREAKDOWN</p>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Admin Fee</span>
                <span className="text-primary font-bold">${split.adminFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Platform ({PLATFORM_SPLIT_PERCENT}%)</span>
                <span className="text-foreground">${split.platformShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">Creator ({CREATOR_SPLIT_PERCENT}%)</span>
                <span className="text-foreground">${split.creatorShare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] border-t border-border pt-1 font-bold">
                <span className="text-muted-foreground">Your Total Revenue</span>
                <span className="text-primary">${split.totalPlatformRevenue.toFixed(2)}</span>
              </div>
            </div>

            <Button variant="neon" className="w-full mt-4" onClick={() => setStep("payment")}>CONTINUE TO PAYMENT</Button>
          </div>
        )}

        {step === "payment" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center mb-2">SELECT PAYMENT METHOD</h3>
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">CRYPTO — INSTANT ACCESS (0-5 MINS)</p>
              <div className="grid grid-cols-3 gap-2">
                {["ltc", "btc", "eth"].map((coin) => (
                  <button key={coin} onClick={() => handleCryptoPay(coin)} className="bg-secondary border border-border rounded-xl p-3 text-center hover:border-primary/50 transition-all">
                    <p className="text-sm font-bold text-foreground">{coin.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold tracking-wider">CARD — SECURE PROCESSING</p>
              <button onClick={handleCardPay} className="w-full bg-secondary border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all">
                <p className="text-sm font-bold text-foreground mb-1">CREDIT / DEBIT CARD</p>
                <p className="text-[10px] text-muted-foreground">Visa / MC / Apple Pay</p>
              </button>
            </div>
            <div className="bg-secondary/50 border border-border rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                All payments settle in <span className="text-primary font-bold">LTC (Litecoin)</span>. Payout destination: Platform Master Wallet.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setStep("select"); setError(null); }}>BACK</Button>
          </div>
        )}

        {step === "processing" && (
          <div className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">PROCESSING</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCrypto ? `Creating ${selectedCrypto.toUpperCase()} payment...` : "Connecting to payment gateway..."}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto"><span className="text-3xl">✓</span></div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">TOKENS CREDITED</h3>
            <p className="text-sm text-muted-foreground">{tokens} Bit-Token{tokens > 1 ? "s" : ""} added to your balance!</p>
            {paymentInfo && (
              <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground">Send <span className="text-primary font-bold">{paymentInfo.pay_amount} {paymentInfo.pay_currency.toUpperCase()}</span> to:</p>
                <p className="text-[10px] text-foreground font-mono break-all">{paymentInfo.pay_address}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyTokensModal;
