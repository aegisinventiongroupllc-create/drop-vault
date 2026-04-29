import { useEffect, useState, type ReactNode } from "react";
import { Globe, Loader2 } from "lucide-react";
import { isBlockedCountry } from "@/lib/restrictedCountries";
import GhostCountryMessage from "@/components/GhostCountryMessage";
import LegalFooter from "@/components/LegalFooter";

const CACHE_KEY = "dtt_geo_country";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

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
      if (j?.country_code) return String(j.country_code).toUpperCase();
    }
  } catch { /* fall through */ }
  // Fallback: ipwho.is (free, CORS-enabled)
  try {
    const r = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j?.country_code) return String(j.country_code).toUpperCase();
    }
  } catch { /* ignore */ }
  return null;
};

const GeoGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GeoState>({ status: "loading" });

  useEffect(() => {
    // Admin bypass — full access regardless of geo
    try {
      if (localStorage.getItem("dtt_admin_override") === "1") {
        setState({ status: "allowed", country: "ADMIN" });
        return;
      }
    } catch { /* ignore */ }

    // Cache check
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { code: string; ts: number };
        if (Date.now() - cached.ts < CACHE_TTL_MS && cached.code) {
          setState(
            isBlockedCountry(cached.code)
              ? { status: "blocked", country: cached.code }
              : { status: "allowed", country: cached.code },
          );
          return;
        }
      }
    } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      const code = await fetchCountry();
      if (cancelled) return;
      if (!code) {
        // Fail-open: don't block on detection failure
        setState({ status: "unknown" });
        return;
      }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ code, ts: Date.now() }));
      } catch { /* ignore */ }
      setState(
        isBlockedCountry(code)
          ? { status: "blocked", country: code }
          : { status: "allowed", country: code },
      );
    })();

    return () => { cancelled = true; };
  }, []);

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
            Access from your detected region ({state.country}) is restricted by our
            payment processor (<span className="font-semibold text-foreground">NOWPayments</span>),
            applicable sanctions law, or local adult-content regulations. See our
            Restricted Countries policy below.
          </p>
        </div>
        <LegalFooter />
      </div>
    );
  }

  // allowed or unknown → render app
  return <>{children}</>;
};

export default GeoGate;
