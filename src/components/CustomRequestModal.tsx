import { useState } from "react";
import { X, Shield, Lock, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIERS = [
  { label: "Standard", price: 100, delivery: "7 days", description: "Basic custom media piece" },
  { label: "Premium", price: 250, delivery: "5 days", description: "High-quality custom content with revisions" },
  { label: "Exclusive", price: 500, delivery: "3 days", description: "Priority production with unlimited revisions" },
  { label: "Ultra VIP", price: 1000, delivery: "48 hours", description: "Top-tier bespoke commission with direct collaboration" },
];

const CustomRequestModal = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm">("select");

  const tier = selectedTier !== null ? TIERS[selectedTier] : null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Custom Request</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escrow badge */}
        <div className="mx-4 mt-4 flex items-center gap-2 bg-secondary/60 border border-primary/20 rounded-lg px-3 py-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium">Secure Escrow</span> — Payment held safely until delivery is confirmed
          </p>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Select a commission tier for <span className="text-foreground font-medium">@{creatorName}</span></p>
            {TIERS.map((t, i) => (
              <button
                key={t.label}
                onClick={() => { setSelectedTier(i); setStep("details"); }}
                className={`w-full text-left bg-secondary/50 border rounded-xl p-4 transition-all hover:border-primary/50 ${
                  selectedTier === i ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{t.label}</span>
                  <span className="text-primary font-bold">${t.price}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Est. delivery: {t.delivery}
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "details" && tier && (
          <div className="p-4 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">{tier.label}</p>
                <p className="text-xs text-muted-foreground">Delivery: {tier.delivery}</p>
              </div>
              <span className="text-primary font-bold text-lg">${tier.price}</span>
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
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>Back</Button>
              <Button
                variant="neon"
                className="flex-1"
                disabled={!description.trim()}
                onClick={() => setStep("confirm")}
              >
                Review & Pay
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && tier && (
          <div className="p-4 space-y-4 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto animate-pulse-glow" />
            <h3 className="text-lg font-semibold text-foreground">Confirm Commission</h3>

            <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creator</span>
                <span className="text-foreground font-medium">@{creatorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tier</span>
                <span className="text-foreground font-medium">{tier.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-foreground font-medium">{tier.delivery}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-lg">${tier.price}.00</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Funds held in secure escrow until delivery confirmed
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("details")}>Back</Button>
              <Button variant="gold" className="flex-1" onClick={onClose}>
                Submit & Pay ${tier.price}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomRequestModal;
