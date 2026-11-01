import { useEffect, useId, useState, type CSSProperties } from "react";
import { activeTheme, hexToHsl, resolveIdleBillboardTheme } from "@/lib/userTheme";
import { Button } from "@/components/ui/button";

/** Advertising inquiries only: no invented sponsors, payment or tracking. */
export default function IdleAdShips({ signedIn }: { signedIn: boolean }) {
  const [theme, setTheme] = useState(activeTheme);
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const update = () => setTheme(activeTheme());
    window.addEventListener("dtt-theme", update);
    return () => window.removeEventListener("dtt-theme", update);
  }, []);
  const colors = resolveIdleBillboardTheme(theme, signedIn);
  const style = {
    "--ship-accent": colors.primary ? hexToHsl(colors.primary) : "var(--ship-default-accent)",
    "--ship-panel": colors.card ? hexToHsl(colors.card) : "var(--ship-default-panel)",
    "--ship-ink": colors.foreground ? hexToHsl(colors.foreground) : "var(--ship-default-ink)",
  } as CSSProperties;
  return <div className="idle-ad-ships pointer-events-none absolute inset-0 overflow-hidden" style={style}>
    {["near", "far"].map((lane) => {
      const metal = `${id}-${lane}-metal`;
      const glass = `${id}-${lane}-glass`;
      return <div key={lane} className={`idle-ad-flight idle-ad-flight-${lane}`}>
        <Button asChild variant="ghost" className="idle-ad-link pointer-events-auto" data-idle-interactive>
          <a href="mailto:admin@dttmediallc.com?subject=DTT%20advertising%20inquiry" aria-label={`Advertise here — ${lane === "near" ? "upper" : "lower"} DTT ship`} title="Email DTT about advertising">
        <svg className="idle-ad-ship" viewBox="0 0 600 240" fill="none" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id={metal} x1="0" y1="70" x2="0" y2="235" gradientUnits="userSpaceOnUse">
              <stop className="ship-metal-light" /><stop offset=".3" className="ship-metal-mid" /><stop offset=".6" className="ship-metal-dark" /><stop offset="1" className="ship-metal-mid" />
            </linearGradient>
            <linearGradient id={glass} x1="210" y1="18" x2="330" y2="150" gradientUnits="userSpaceOnUse">
              <stop className="ship-glass-light" /><stop offset="1" className="ship-glass-dark" />
            </linearGradient>
          </defs>
          <path className="ship-exhaust" d="m120 170-116-13 39 23L4 204l125-17Z" />
          <path fill={`url(#${metal})`} d="m115 164-38-34 89 17 256-4 154 35-104 30H152l-56-25Z" />
          <path className="ship-seam" d="m137 172 289-9 119 15-86 18H160l-38-15" />
          <path className="ship-running-light" d="m122 185 45 11h286l72-16" />
          <path className="ship-panel-rim" d="m156 30 24-16h261l25 20-9 99-24 16H173l-24-20Z" />
          <path fill={`url(#${glass})`} className="ship-glass" d="m172 38 14-10h247l17 14-7 79-16 13H184l-19-13Z" />
          <path className="ship-glint" d="m187 34 238 0m-245 92h248" />
          <path className="ship-hologram" d="m168 47 276 0m-278 16h277m-279 16h278m-279 16h278m-277 16h275" />
          <g transform="translate(306 66)">
            <text className="ship-wordmark" textAnchor="middle" dominantBaseline="middle">DTT</text>
            <text className="ship-ad-label" y="39" textAnchor="middle">ADVERTISE HERE</text>
          </g>
          <path className="ship-cockpit" d="m458 150 34-5 46 23-72-5Z" />
          <path className="ship-running-light" d="m160 40 2 75m294-71-5 71M168 208h78m150 0h61" />
          <path className="ship-seam" d="m186 154 13 12m23-12 13 12m23-12 13 12" />
        </svg>
          </a>
        </Button>
      </div>;
    })}
  </div>;
}