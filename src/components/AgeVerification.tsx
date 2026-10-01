import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import LanguageToggle from "@/components/LanguageToggle";
import LegalFooter from "@/components/LegalFooter";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  const { t } = useI18n();
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

      const fullConsentText = `[AGE] ${t.age_consent} [TOS] ${t.tos_consent} [CONTRACTOR] ${t.contractor_consent}`;

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      {/* Language toggle top-right */}
      <div className="absolute top-4 right-4 z-50">
        <LanguageToggle />
      </div>

      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center neon-glow">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-2">
            {t.age_title}<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.age_subtitle}
          </p>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="age-check" checked={ageChecked} onCheckedChange={(v) => setAgeChecked(v === true)} className="mt-0.5 shrink-0" />
          <label htmlFor="age-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.age_consent}
          </label>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="tos-check" checked={tosChecked} onCheckedChange={(v) => setTosChecked(v === true)} className="mt-0.5 shrink-0" />
          <label htmlFor="tos-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.tos_consent}
          </label>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="contractor-check" checked={contractorChecked} onCheckedChange={(v) => setContractorChecked(v === true)} className="mt-0.5 shrink-0" />
          <label htmlFor="contractor-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.contractor_consent}
          </label>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button variant="neon" size="lg" className="w-full text-base font-semibold" onClick={handleEnter} disabled={!allChecked}>
            {t.age_enter}
          </Button>
          <Button variant="ghost" size="lg" className="w-full text-muted-foreground" onClick={() => window.location.href = "https://google.com"}>
            {t.age_leave}
          </Button>
        </div>

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default AgeVerification;
