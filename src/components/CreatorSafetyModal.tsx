import { useState } from "react";
import { Button } from "@/components/ui/button";

const CreatorSafetyModal = ({ onAgree }: { onAgree: () => void }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-4 text-center">
          <h2 className="font-display text-base font-bold tracking-wider text-foreground">
            SAFETY & INTEGRITY PROTOCOL
          </h2>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
            <p>
              Welcome to <span className="text-foreground font-medium">DROPTHATTHING</span>. As a Creator on this platform,
              you are responsible for all content you upload and distribute.
            </p>
            <p>
              <span className="text-foreground font-medium">Content Standards:</span> All content must be legal, consensual,
              and comply with our community guidelines. No content involving minors, non-consensual acts, or illegal activities
              will be tolerated.
            </p>
            <p>
              <span className="text-foreground font-medium">Age Verification:</span> You confirm that you are at least 18 years
              of age and have provided valid identification for verification.
            </p>
            <p>
              <span className="text-foreground font-medium">Revenue & Payouts:</span> Creator payouts are subject to the
              platform's revenue split policy (90/10 default). All transactions are final.
            </p>
            <p>
              <span className="text-foreground font-medium">Privacy & Data:</span> Your personal information is stored securely
              and will never be shared without consent.
            </p>
            <p>
              For questions or concerns, contact: <a href="mailto:admin@dttmediallc.com" className="text-primary underline">admin@dttmediallc.com</a>
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
            />
            <span className="text-xs text-foreground">
              I have read and agree to the Safety & Integrity Protocol and the platform's Terms of Service.
            </span>
          </label>

          <Button variant="neon" className="w-full" disabled={!agreed} onClick={onAgree}>
            AGREE & CONTINUE
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatorSafetyModal;
