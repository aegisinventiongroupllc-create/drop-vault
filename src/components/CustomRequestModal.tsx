import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRequestTokens } from "@/lib/tokenEconomy";

const TIERS = [
  { label: "Standard", price: 100, delivery: "7 days", description: "Basic custom media piece" },
  { label: "Premium", price: 250, delivery: "5 days", description: "High-quality custom content with revisions" },
  { label: "Exclusive", price: 500, delivery: "3 days", description: "Priority production with unlimited revisions" },
  { label: "Ultra VIP", price: 1000, delivery: "48 hours", description: "Top-tier bespoke commission with direct collaboration" },
];

const CustomRequestModal = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm">("select");

  const tier = selectedTier !== null ? TIERS[selectedTier] : null;
  const activePrice = tier?.price ?? Number(customAmount) || 0;
  const tokenCalc = calculateRequestTokens(activePrice);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">CUSTOM REQUEST</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Calculator */}
        <div className="mx-4 mt-4 bg-secondary/60 border border-primary/20 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground mb-1">SMART TOKEN CALCULATOR</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
            {[100, 250, 500, 1000].map(usd => {
              const calc = calculateRequestTokens(usd);
              return (
                <div key={usd} className="bg-card rounded p-1.5">
                  <p className="text-foreground font-bold">${usd}</p>
                  <p className="text-primary">{calc.total} BT</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Includes +1 Bit-Token platform convenience fee</p>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Select a tier for <span className="text-foreground font-medium">@{creatorName}</span></p>
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
                      <p className="text-[10px] text-muted-foreground">{calc.total} Tokens</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === "details" && (
          <div className="p-4 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{tier?.label ?? "Custom"}</p>
                <p className="text-xs text-muted-foreground">Delivery: {tier?.delivery ?? "TBD"}</p>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-lg">${activePrice}</span>
                <p className="text-xs text-muted-foreground">{tokenCalc.total} BT total</p>
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
                <span className="text-foreground font-medium">{tier?.label ?? "Custom"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="text-foreground font-medium">{tokenCalc.baseTokens} BT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-primary font-medium">+{tokenCalc.fee} BT</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-lg">{tokenCalc.total} Bit-Tokens</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>BACK</Button>
              <Button variant="neon" className="flex-1" onClick={onClose}>
                SUBMIT REQUEST
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomRequestModal;
