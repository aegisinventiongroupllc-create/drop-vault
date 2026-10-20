import { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateRequestTokens, calculateCustomRequestSplit, TOKEN_VALUE_USD, ADMIN_FEE_USD, CUSTOM_REQUEST_PROCESSING_FEE_USD, TOKEN_BASE_VALUE_USD } from "@/lib/tokenEconomy";
import { supabase } from "@/integrations/supabase/client";


const MAX_TOKENS = 500; // 500 BT = $10,001 ceiling
const MIN_CUSTOM_BID_TOKENS = 1;

const CustomRequestModal = ({ creatorName, onClose }: { creatorName: string; onClose: () => void }) => {
  const [customBidTokens, setCustomBidTokens] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"select" | "details" | "confirm" | "success">("select");
  const [error, setError] = useState<string | null>(null);

  // Calculate price based on custom bid
  const bidTokens = Math.min(Number(customBidTokens) || 0, MAX_TOKENS);
  const activePrice = bidTokens * TOKEN_BASE_VALUE_USD;
  const tokenCalc = calculateRequestTokens(activePrice);
  const split = calculateCustomRequestSplit(activePrice);
  const totalDue = split.invoiceTotal;


  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="w-full max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground font-display tracking-wider">CUSTOM REQUEST</h2>
          <Button variant="ghost" size="icon" aria-label="Close request" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ─── STEP 1: Select Tier or Custom Bid ─── */}
        {step === "select" && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Make your offer to <span className="text-foreground font-medium">@{creatorName}</span>
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
                  }}
                  placeholder="e.g. 50"
                  className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                <Button
                  variant="gold"
                  size="sm"
                  disabled={!customBidTokens || Number(customBidTokens) < MIN_CUSTOM_BID_TOKENS}
                  onClick={() => setStep("details")}
                >
                  BID
                </Button>
              </div>
              {customBidTokens && Number(customBidTokens) > 0 && (
                <p className="text-[10px] text-gold mt-1">
                  = ${Math.min(Number(customBidTokens), MAX_TOKENS) * TOKEN_BASE_VALUE_USD} USD + $1 service fee + $4 processing cover
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Describe Request ─── */}
        {step === "details" && (
          <div className="p-4 space-y-4">
            <div className="bg-secondary/50 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-foreground">Custom Bid</p>
                <p className="text-xs text-muted-foreground">{bidTokens} Bit-Tokens</p>
              </div>
              <div className="text-right">
                <span className="text-primary font-bold text-lg">${activePrice}</span>
                <p className="text-[10px] text-muted-foreground">Service fee: ${ADMIN_FEE_USD}</p>
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
                <span className="text-muted-foreground">Custom Bid</span>
                <span className="text-foreground font-medium">{bidTokens} BT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="text-foreground font-medium">${activePrice}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee</span>
                <span className="text-gold font-medium">+${ADMIN_FEE_USD}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Card processing cover</span>
                <span className="text-gold font-medium">+${CUSTOM_REQUEST_PROCESSING_FEE_USD}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-lg">${totalDue}</span>
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
              <Button variant="neon" className="flex-1" onClick={async () => {
                setError(null);
                try {
                  const { data: u } = await supabase.auth.getUser();
                  if (!u.user) { setError("Please sign in first."); return; }
                  const { data: creatorProfile } = await supabase
                    .from("public_profiles")
                    .select("user_id")
                    .eq("display_name", creatorName)
                    .maybeSingle();
                  const { error: insertErr } = await supabase.from("custom_requests").insert({
                    customer_id: u.user.id,
                    creator_id: creatorProfile?.user_id ?? null,
                    creator_name: creatorName,
                    description,
                    amount_usd: activePrice,
                    tokens: tokenCalc.total,
                    creator_share_usd: Math.round(split.creatorShare * 100) / 100,
                    platform_share_usd: Math.round(split.totalPlatformRevenue * 100) / 100,
                    status: "pending",
                    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
                  });
                  if (insertErr) { setError(insertErr.message); return; }
                  import("@/lib/activityLog").then(({ logActivity }) =>
                    logActivity("custom_request_sent", `Request to ${creatorName}`, {
                      creator: creatorName, amount_usd: activePrice, tokens: tokenCalc.total,
                    })
                  );
                  setStep("success");
                } catch (err: any) {
                  setError(err.message || "Failed to submit request.");
                }
              }}>
                SUBMIT REQUEST
              </Button>
            </div>
          </div>
        )}

        {error && <p role="alert" className="px-4 py-3 text-sm text-destructive">{error}</p>}

        {/* ─── Success ─── */}
        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-lg font-bold text-foreground font-display tracking-wider">REQUEST SUBMITTED</h3>
            <p className="text-sm text-muted-foreground">
              Your request has been sent to <span className="text-foreground font-medium">@{creatorName}</span>. They can accept, decline, or send a counter-offer. You'll see updates in your dashboard under MY REQUESTS.
            </p>
            <p className="text-[10px] text-muted-foreground">Requests expire in 14 days if the creator doesn't respond.</p>
            <p className="text-xs text-muted-foreground">Submitting a request does not take payment. Checkout requires creator acceptance and an available payment connection.</p>
            <Button variant="neon" className="w-full" onClick={onClose}>DONE</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomRequestModal;
