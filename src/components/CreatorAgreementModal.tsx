import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHARGEBACK_EARNINGS, DISPUTE_SUMMARY } from "@/components/RefundDisputeNotice";

export const CREATOR_AGREEMENT_VERSION = "1.8";
export const CREATOR_AGREEMENT_TEXT =
  "DTT Creator Agreement v1.8 with DTT Media LLC: I am 18+ and an independent contractor; I own or have rights to everything I upload; " +
  "standard payout is 90% of each $20 Bit-Token value; the first 5 qualifying approved creators in each of Women, Men, Trans Women and Trans Men per country (20 places total) receive a straight 91% for life after verified identity, reviewed residence and category setup, and may also buy a VIP pass; existing awards keep their original split; once a year, one winner per country across all four categories, based on the most unique paid library followers at year-end UTC, receives 95% for life with administrator confirmation required before the award is applied, the only 95/5 split; " +
  "Pro Pass grants 92/8 forever and Elite Pass grants 93/7 for life; VIP passes are limited to 500 Pro and 500 Elite worldwide, 1,000 total, on a first-come, first-served basis; a free waiting-list ticket does not reserve a pass or grant benefits; activation requires verified payment through available TryBit checkout; without a pass, each 100k all-time unique customers who paid to unlock my library starts a 7-day 92/8 Power Week, then the applicable lifetime baseline resumes; a confirmed annual 95/5 award takes precedence over other vault rates; each customer counts once, renewals and likes/hearts never count; custom requests split 85/15 for standard, founding, Pro and year-end award creators; only a purchased Elite VIP pass activated after verified payment grants 90/10 on the agreed request price; vault awards do not change request splits; payouts are manual in Litecoin (LTC); " +
  `${CHARGEBACK_EARNINGS} ${DISPUTE_SUMMARY} Refunds and creator-departure Bit-cent credits follow the Refund Policy. ` +
  "I may leave at any time and DTT may suspend accounts that break the Creator & Purchase Rules or Terms of Service.";

const CreatorAgreementModal = ({ onAgree }: { onAgree: () => Promise<void> }) => {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (!agreed || busy) return;
    setBusy(true); setError("");
    try { await onAgree(); }
    catch { setError("Your agreement could not be saved. Please retry."); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4 text-center">
          <h2 className="font-display text-base font-bold tracking-wider text-foreground">CREATOR AGREEMENT</h2>
        </div>
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p>This agreement is between you and DTT Media LLC. There is no minimum term; you can stop at any time.</p>
            <p><span className="text-foreground font-medium">Your earnings.</span> Standard vault earnings use a 90/10 split of the $20 Bit-Token spending value ($18 to you), not the checkout price. Included purchase fees never reduce that spending value. Founding, VIP and annual-award vault rates are explained below; requests and tips have separate terms.</p>
            <p><span className="text-foreground font-medium">Founding creators.</span> The first 5 qualifying approved creators in each category—Women, Men, Trans Women and Trans Men—per country receive a straight 91/9 ($18.20 per token) for life: 20 places total. Verified identity, reviewed residence and category setup are required. Existing awards keep their original split. Founding creators may also buy a VIP pass.</p>
            <p><span className="text-foreground font-medium">Annual 95/5 award.</span> Once a year, one winner per country across all four categories, based on the most unique paid library followers at year-end UTC, receives 95/5 ($19.00 per token) for life, with administrator confirmation required before the award is applied. This is the only way to earn 95/5.</p>
            <p><span className="text-foreground font-medium">Power Week.</span> Without a VIP pass, at 100,000 paid followers you receive 92/8 ($18.40 per token) for 7 days, then your applicable lifetime baseline resumes. Standard creators return to 90/10; founders retain 91/9 and existing awards are preserved. An annual 95/5 award is never reduced. Another Power Week starts at each additional 100,000. Each unique customer who paid to unlock your library counts once; renewals, likes, hearts, tips and the DTT entry pass alone do not count.</p>
            <p><span className="text-foreground font-medium">VIP passes.</span> PRO PASS ($1,500) grants 92/8 forever. ELITE PASS ($3,500) grants 93/7 for life. <span className="text-primary font-medium">Limited to 500 Pro and 500 Elite worldwide, 1,000 total. First come, first served.</span> A free waiting-list ticket does not reserve a pass or grant benefits. Power Weeks do not apply to VIP holders; a confirmed annual 95/5 award takes precedence. Activation requires verified payment through available TryBit checkout. <span>A new batch of VIP passes launches every year on the founder's birthday, May 1 at midnight (New York time).</span></p>
            <p><span className="text-foreground font-medium">Tips.</span> You keep 100% of the $20-per-token spending value. There is no separate tipping fee or platform share; included token purchase fees are unchanged.</p>
            <p><span className="text-foreground font-medium">Custom requests.</span> Standard, founding, Pro and year-end award creators receive 85/15 of the agreed request price. Only a purchased Elite VIP pass activated after verified payment grants 90/10 on requests. Vault awards do not change request splits; customer-paid fees are separate. Delivery requires confirmed customer payment. <span>DTT provides a built-in calendar on your Requests page to plan your day, set reminders and keep track of agreed requests.</span></p>
            <p><span className="text-foreground font-medium">Payouts and disputes.</span> Sent manually in Litecoin (LTC). {CHARGEBACK_EARNINGS} {DISPUTE_SUMMARY} Refunds and creator-departure Bit-cent credits follow the Refund Policy.</p>
            <p><span className="text-foreground font-medium">Your content.</span> You are 18+, an independent contractor, and you own or have the rights to everything you upload, including consent from anyone shown.</p>
            <p>Breaking the Creator &amp; Purchase Rules or Terms of Service may lead to suspension.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreed} disabled={busy} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary" />
            <span className="text-xs text-foreground">I have read and agree to the DTT Creator Agreement.</span>
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
          <Button variant="neon" className="w-full" disabled={!agreed || busy} onClick={() => void save()}>{busy ? "SAVING…" : "AGREE & CONTINUE"}</Button>
        </div>
      </div>
    </div>
  );
};

export default CreatorAgreementModal;
