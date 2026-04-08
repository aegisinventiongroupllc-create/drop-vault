import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOKEN_VALUE_USD, BUNDLE_TOKENS, BUNDLE_PRICE_USD } from "@/lib/tokenEconomy";

interface BuyTokensModalProps {
  onClose: () => void;
  onPurchase: (tokens: number) => void;
}

const BuyTokensModal = ({ onClose, onPurchase }: BuyTokensModalProps) => {
  const [selectedOption, setSelectedOption] = useState<"single" | "bundle">("bundle");
  const [step, setStep] = useState<"select" | "payment" | "success">("select");

  const handlePay = () => {
    setStep("success");
    setTimeout(() => {
      onPurchase(selectedOption === "bundle" ? BUNDLE_TOKENS : 1);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">BUY TOKENS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            {/* Single Token */}
            <button
              onClick={() => setSelectedOption("single")}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all ${
                selectedOption === "single" ? "border-primary bg-primary/5" : "border-border bg-secondary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                  <span className="font-semibold text-foreground">1 Bit-Token</span>
                </div>
                <span className="text-lg font-bold text-primary">${TOKEN_VALUE_USD}</span>
              </div>
            </button>

            {/* Bundle */}
            <button
              onClick={() => setSelectedOption("bundle")}
              className={`w-full text-left rounded-xl p-4 border-2 transition-all relative overflow-hidden ${
                selectedOption === "bundle" ? "border-primary bg-primary/5 neon-glow-sm" : "border-border bg-secondary/50"
              }`}
            >
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                MOST POPULAR
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-sm font-bold text-gold-foreground">B</span>
                  <div>
                    <span className="font-semibold text-foreground">{BUNDLE_TOKENS} Bit-Tokens</span>
                    <p className="text-[10px] text-primary font-bold">Buy 5, Get 1 Free</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">${BUNDLE_PRICE_USD}</span>
                  <p className="text-[10px] text-muted-foreground line-through">${TOKEN_VALUE_USD * BUNDLE_TOKENS}</p>
                </div>
              </div>
            </button>

            <Button variant="neon" className="w-full mt-4" onClick={() => setStep("payment")}>
              CONTINUE TO PAYMENT
            </Button>
          </div>
        )}

        {step === "payment" && (
          <div className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-foreground tracking-wider text-center mb-2">SELECT PAYMENT METHOD</h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePay}
                className="bg-secondary border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all"
              >
                <p className="text-sm font-bold text-foreground mb-1">CRYPTO</p>
                <p className="text-[10px] text-muted-foreground">Instant Access</p>
                <p className="text-[10px] text-muted-foreground">0-5 mins</p>
                <p className="text-[10px] text-primary mt-1">LTC / BTC / ETH</p>
              </button>

              <button
                onClick={handlePay}
                className="bg-secondary border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-all"
              >
                <p className="text-sm font-bold text-foreground mb-1">CARD</p>
                <p className="text-[10px] text-muted-foreground">Secure Processing</p>
                <p className="text-[10px] text-muted-foreground">15-30 mins first time</p>
                <p className="text-[10px] text-primary mt-1">Visa / MC / Apple Pay</p>
              </button>
            </div>

            <div className="bg-secondary/50 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground">
                First-time card buyers receive a <span className="text-primary font-bold">Trust Token</span> for instant access while payment clears.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => setStep("select")}>
              BACK
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">TOKENS CREDITED</h3>
            <p className="text-sm text-muted-foreground">
              {selectedOption === "bundle" ? BUNDLE_TOKENS : 1} Bit-Token{selectedOption === "bundle" ? "s" : ""} added to your balance!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyTokensModal;
