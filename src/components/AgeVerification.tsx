import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useReducedMotion } from "framer-motion";
import EntryPassGlobe from "@/components/EntryPassGlobe";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import LegalFooter from "@/components/LegalFooter";
import { affirmAgeConsent } from "@/lib/ageConsent";

const AgeVerification = ({ onVerified }: { onVerified: () => void }) => {
  const { t } = useI18n();
  const [ageChecked, setAgeChecked] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [contractorChecked, setContractorChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reducedMotion = useReducedMotion();
  const rippleId = useRef(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  const checkWithRipple = (value: boolean | "indeterminate", setChecked: (checked: boolean) => void, elementId: string) => {
    setChecked(value === true);
    if (value !== true || reducedMotion) return;
    const box = document.getElementById(elementId)?.getBoundingClientRect();
    if (!box) return;
    const ripple = { id: ++rippleId.current, x: box.left + box.width / 2, y: box.top + box.height / 2 };
    setRipples(current => [...current.slice(-3), ripple]);
  };

  const allChecked = ageChecked && tosChecked && contractorChecked;

  const handleEnter = async () => {
    if (!allChecked || busy) return;
    setBusy(true); setError("");

    try {
      let ipAddress = "unknown";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {}

      const fullConsentText = `[AGE] ${t.age_consent} [TOS] ${t.tos_consent} [CONTRACTOR] ${t.contractor_consent}`;

      const result = await supabase.from("legal_consents").insert({
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
        terms_version: "2.0",
        consent_text: fullConsentText,
        consent_type: "age_tos_contractor_gate",
      });
      if (result.error) throw result.error;
      const receipt=await affirmAgeConsent("entry");
      localStorage.setItem("dtt_age_consent_receipt",receipt);
      onVerified();
    } catch { setError("Your consent could not be saved. Please retry before entering."); }
    finally { setBusy(false); }
  };

  return (
    <div className="dtt-consent-screen fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        {ripples.map(ripple => (
          <div key={ripple.id} className="consent-ripple-origin" style={{ left: ripple.x, top: ripple.y }}>
            {[0, 1, 2].map(ring => (
              <span key={ring} className={`consent-ripple consent-ripple-${ring}`} onAnimationEnd={ring === 2 ? () => setRipples(current => current.filter(item => item.id !== ripple.id)) : undefined} />
            ))}
          </div>
        ))}
      </div>
      <div className="relative flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div className="consent-globe relative h-20 w-20" aria-hidden="true">
          <EntryPassGlobe size={80} sharp bright motionless={Boolean(reducedMotion)} />
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-2">
            {t.age_title}<span className="text-primary">THING</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t.age_subtitle}
          </p>
          <p className="mt-3 text-sm text-foreground">This site contains adult material. You must be at least 18 years of age (or the age of majority in your jurisdiction) to enter.</p>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="age-check" checked={ageChecked} onCheckedChange={(v) => checkWithRipple(v, setAgeChecked, "age-check")} className="mt-0.5 shrink-0" />
          <label htmlFor="age-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.age_consent}
          </label>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="tos-check" checked={tosChecked} onCheckedChange={(v) => checkWithRipple(v, setTosChecked, "tos-check")} className="mt-0.5 shrink-0" />
          <label htmlFor="tos-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.tos_consent}
          </label>
        </div>

        <div className="flex items-start gap-3 text-left bg-secondary/50 border border-border rounded-lg p-3 w-full">
          <Checkbox id="contractor-check" checked={contractorChecked} onCheckedChange={(v) => checkWithRipple(v, setContractorChecked, "contractor-check")} className="mt-0.5 shrink-0" />
          <label htmlFor="contractor-check" className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            {t.contractor_consent}
          </label>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="neon" size="lg" className="w-full px-2 text-sm font-semibold" onClick={handleEnter} disabled={!allChecked}>
              {busy ? "SAVING…" : t.age_enter}
            </Button>
            <Button variant="outline" size="lg" className="w-full px-2 text-sm font-bold tracking-wider" onClick={handleEnter} disabled={!allChecked} aria-label="LOG IN">
              LOG IN
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Already a member? Confirm the three statements above, then tap LOG IN to continue on any device.
          </p>
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
