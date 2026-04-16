import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CONSENT_AGE = "I certify that I am at least 18 years of age and legally permitted to view adult content in my jurisdiction.";
const CONSENT_TOS = "I have read, understand, and agree to the Terms of Service and Privacy Policy of DTT Media LLC. I understand that all card transactions are final and handled via a secure third-party processor.";
const CONSENT_CONTRACTOR = "I acknowledge that all creators on this platform are independent contractors, not employees of DTT Media LLC. I agree to hold DTT Media LLC and its affiliates harmless and waive all rights to legal action.";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  const [ageChecked, setAgeChecked] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [contractorChecked, setContractorChecked] = useState(false);

  const allChecked = ageChecked && tosChecked && contractorChecked;

  const handleEnter = async () => {
    if (!allChecked) return;

    try {
      let ipAddress = "unknown";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {}

      const fullConsentText = `[AGE] ${CONSENT_AGE} [TOS] ${CONSENT_TOS} [CONTRACTOR] ${CONSENT_CONTRACTOR}`;

      await supabase.from("legal_consents").insert({
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        terms_version: "2.0",
        consent_text: fullConsentText,
        consent_type: "age_tos_contractor_gate",
      });
    } catch {}

    onVerified();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 px-6 text-center max-w-sm">
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
            This platform contains age-restricted content. You must agree to all terms below to enter.
          </p>
        </div>

        {/* Checkbox 1: 18+ */}
        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox
            id="age-check"
            checked={ageChecked}
            onCheckedChange={(v) => setAgeChecked(v === true)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="age-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {CONSENT_AGE}
          </label>
        </div>

        {/* Checkbox 2: TOS */}
        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox
            id="tos-check"
            checked={tosChecked}
            onCheckedChange={(v) => setTosChecked(v === true)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="tos-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {CONSENT_TOS}
          </label>
        </div>

        {/* Checkbox 3: Independent Contractor */}
        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox
            id="contractor-check"
            checked={contractorChecked}
            onCheckedChange={(v) => setContractorChecked(v === true)}
            className="mt-0.5 shrink-0"
          />
          <label htmlFor="contractor-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {CONSENT_CONTRACTOR}
          </label>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="neon"
            size="lg"
            className="w-full text-base font-semibold"
            onClick={handleEnter}
            disabled={!allChecked}
          >
            I AGREE — ENTER
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
          © {new Date().getFullYear()} DTT Media LLC. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AgeVerification;
