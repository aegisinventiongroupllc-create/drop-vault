import { useEffect, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import GhostCountryMessage from "@/components/GhostCountryMessage";
import LegalFooter from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";

type GeoState =
  | { status: "loading" }
  | { status: "allowed"; country: string }
  | { status: "blocked"; country: string }
  | { status: "unknown" };

const fetchCountry = async (): Promise<string | null> => {
  // Try ipapi.co first (free, CORS-enabled)
  try {
    const r = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (isCountryCode(j?.country_code)) return j.country_code.toUpperCase();
    }
  } catch { /* fall through */ }
  // Fallback: ipwho.is (free, CORS-enabled)
  try {
    const r = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j?.success !== false && isCountryCode(j?.country_code)) return j.country_code.toUpperCase();
    }
  } catch { /* ignore */ }
  return null;
};

const isCountryCode = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Za-z]{2}$/.test(code) && !["XX", "ZZ", "AA", "EU", "AP", "UN"].includes(code.toUpperCase());

const GeoGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GeoState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState({ status: "loading" });
    let cancelled = false;
    (async () => {
      const code = await fetchCountry();
      if (cancelled) return;
      if (!code) {
        setState({ status: "unknown" });
        return;
      }
      setState(
        isBlockedCountry(code)
          ? { status: "blocked", country: code }
          : { status: "allowed", country: code },
      );
    })();

    return () => { cancelled = true; };
  }, [attempt]);

  if (state.status === "loading") {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <p className="text-[11px] text-muted-foreground tracking-wider">VERIFYING REGION…</p>
      </div>
    );
  }

  if (state.status === "blocked") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex items-center justify-center pt-10 pb-4 px-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-destructive" />
            <p className="text-[11px] font-bold tracking-widest text-destructive">
              REGION RESTRICTED
            </p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <GhostCountryMessage countryCode={state.country} />
          <p className="mt-4 px-6 text-center text-[10px] text-muted-foreground/70 max-w-sm">
            DTT is not available in your detected region ({state.country}) under our current market restrictions. See the Restricted Countries policy below.
          </p>
        </div>
        <LegalFooter />
      </div>
    );
  }

  if (state.status === "unknown") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-sm font-bold text-foreground">REGION COULD NOT BE VERIFIED</h1>
          <p className="text-xs text-muted-foreground max-w-sm">Access is paused until we can verify your region. Please try again or contact admin@dttmediallc.com.</p>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>TRY AGAIN</Button>
        </div>
        <LegalFooter />
      </div>
    );
  }

  return <>{children}</>;
};

export default GeoGate;
