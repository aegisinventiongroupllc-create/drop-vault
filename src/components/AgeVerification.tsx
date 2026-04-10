import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 px-6 text-center max-w-sm">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center neon-glow">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-2">
            DROPTHAT<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This platform contains age-restricted content. You must be 18 years or older to enter.
          </p>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-4">
          <Checkbox
            id="age-agree"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="age-agree" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            I agree to the Terms of Service and Privacy Policy of DTT Media. I understand that all card transactions are final and handled via a secure third-party processor. I certify I am 18+ and waive all rights to sue for disbursement or technical delays.
          </label>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-base font-semibold"
            onClick={onVerified}
            disabled={!agreed}
          >
            I AM 18 OR OLDER — ENTER
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground"
            onClick={() => window.location.href = "https://google.com"}
          >
            I AM UNDER 18 — LEAVE
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} DTT Media. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AgeVerification;
