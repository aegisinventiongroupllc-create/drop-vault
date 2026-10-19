import { useState } from "react";
import { Button } from "@/components/ui/button";

export const CREATOR_AGREEMENT_VERSION = "1.0";
export const CREATOR_AGREEMENT_TEXT =
  "DTT Creator Agreement v1.0 with DTT Media LLC: I am 18+ and an independent contractor; I own or have rights to everything I upload; " +
  "standard payout is 90% of each $20 Bit-Token value; the first 10 approved women and 10 approved men creators per country receive 92% for one year from approval, then 90%; " +
  "Power Week pays 95% for 7 days; custom requests pay 85% of the agreed price; payouts are manual in Litecoin (LTC); charged-back earnings are reversed; " +
  "I may leave at any time and DTT may suspend accounts that break the Creator & Purchase Rules or Terms of Service.";

const CreatorAgreementModal = ({ onAgree }: { onAgree: () => void }) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4 text-center">
          <h2 className="font-display text-base font-bold tracking-wider text-foreground">CREATOR AGREEMENT</h2>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p>This agreement is between you and DTT Media LLC. There is no minimum term; you can stop at any time.</p>
            <p><span className="text-foreground font-medium">Your earnings.</span> You keep 90% of every $20 Bit-Token value ($18). The customer's $5 service fee never reduces your share.</p>
            <p><span className="text-foreground font-medium">Founding creators.</span> The first 10 approved women and the first 10 approved men creators in each country are locked in at 92/8 ($18.40 per token) for one full year from approval. After that year you return to 90/10.</p>
            <p><span className="text-foreground font-medium">Power Week.</span> At each 100,000-follower milestone you earn 95% for 7 days.</p>
            <p><span className="text-foreground font-medium">Custom requests.</span> You earn 85% of the agreed price, delivered only after the customer pays.</p>
            <p><span className="text-foreground font-medium">Payouts.</span> Sent manually in Litecoin (LTC). Earnings from charged-back payments are reversed.</p>
            <p><span className="text-foreground font-medium">Your content.</span> You are 18+, an independent contractor, and you own or have the rights to everything you upload, including consent from anyone shown.</p>
            <p>Breaking the Creator &amp; Purchase Rules or Terms of Service may lead to suspension.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary" />
            <span className="text-xs text-foreground">I have read and agree to the DTT Creator Agreement.</span>
          </label>
          <Button variant="neon" className="w-full" disabled={!agreed} onClick={onAgree}>AGREE &amp; CONTINUE</Button>
        </div>
      </div>
    </div>
  );
};

export default CreatorAgreementModal;
