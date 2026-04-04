import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 px-6 text-center max-w-sm">
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

        <div className="flex flex-col gap-3 w-full">
          <Button variant="neon" size="lg" className="w-full text-base font-semibold" onClick={onVerified}>
            I am 18 or older — Enter
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full text-muted-foreground"
            onClick={() => window.location.href = "https://google.com"}
          >
            I am under 18 — Leave
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/50">
          By entering, you agree to our Terms of Service and confirm your age.
        </p>
      </div>
    </div>
  );
};

export default AgeVerification;
