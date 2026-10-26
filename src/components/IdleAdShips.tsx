import { useEffect, useId, useState, type CSSProperties } from "react";
import { activeTheme, hexToHsl, resolveIdleBillboardTheme } from "@/lib/userTheme";

/** Decorative inventory preview only: no invented sponsors or external ad requests. */
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
  return <div className="idle-ad-ships pointer-events-none absolute inset-0 overflow-hidden" style={style} aria-hidden="true">
    {["near", "far"].map((lane) => {
      const metal = `${id}-${lane}-metal`;
      const glass = `${id}-${lane}-glass`;
      return <div key={lane} className={`idle-ad-flight idle-ad-flight-${lane}`}>
        <svg className="idle-ad-ship" viewBox="0 0 600 240" fill="none" focusable="false">
          <defs>
            <linearGradient id={metal} x1="0" y1="70" x2="0" y2="235" gradientUnits="userSpaceOnUse">
              <stop className="ship-metal-light" /><stop offset=".3" className="ship-metal-mid" /><stop offset=".6" className="ship-metal-dark" /><stop offset="1" className="ship-metal-mid" />
            </linearGradient>
            <linearGradient id={glass} x1="210" y1="18" x2="330" y2="150" gradientUnits="userSpaceOnUse">
              <stop className="ship-glass-light" /><stop offset="1" className="ship-glass-dark" />
            </linearGradient>
          </defs>
          <path className="ship-exhaust" d="M110 165 0 154 25 179 0 195 117 185Z" />
          <path fill={`url(#${metal})`} d="m120 157-25-43 100 30 241-3 134 31-120 40H172l-66-26Z" />
          <path className="ship-seam" d="m142 164 300-7 104 18-103 21H180l-48-17" />
          <path fill={`url(#${metal})`} d="m233 146 10-49h11l-6 49m148 0-10-49h-11l6 49" />
          <path className="ship-panel-rim" d="M190 24 399 15l22 99-212 8Z" />
          <path fill={`url(#${glass})`} className="ship-glass" d="m198 31 194-8 19 83-196 8Z" />
          <path className="ship-glint" d="m202 33 182-7M216 116l194-8" />
          <g transform="translate(303 67) rotate(-2)">
            <text className="ship-wordmark" textAnchor="middle" dominantBaseline="middle">DTT</text>
            <text className="ship-ad-label" y="27" textAnchor="middle">AD SPACE</text>
          </g>
          <path fill={`url(#${metal})`} d="m300 167 20-41 56-2 53 35Z" />
          <path className="ship-cockpit" d="m326 135 45-2 32 22-87 7Z" />
          <path className="ship-running-light" d="m169 202 280-1m-12-39 83 15M117 164l-2 18" />
          <path className="ship-seam" d="m209 183 11 14m28-14 11 14m28-14 11 14m28-14 11 14" />
        </svg>
      </div>;
    })}
  </div>;
}