import { useMemo, useState } from "react";
import { Search, X, Globe } from "lucide-react";
import { COUNTRIES } from "@/components/GlobalPassport";

interface GlobePickerProps {
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

// Full-screen spinning-globe country picker. The globe is pure CSS:
// a shaded sphere with a rotating highlight ring and orbiting flags.
const GlobePicker = ({ selected, onSelect, onClose }: GlobePickerProps) => {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const current = COUNTRIES.find((c) => c.code === selected) ?? COUNTRIES[0];
  const orbitFlags = COUNTRIES.filter((c) => c.code !== "GLOBAL").slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with search bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries... Mexico, Japan, Russia..."
            className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Spinning globe */}
      <div className="relative flex items-center justify-center py-6 select-none" aria-hidden>
        <div className="relative w-40 h-40">
          {/* Sphere */}
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/0.55),hsl(var(--primary)/0.15)_45%,transparent_70%)] border border-primary/40 shadow-[0_0_60px_hsl(var(--primary)/0.35)] overflow-hidden">
            {/* Rotating meridian lines */}
            <div className="absolute inset-0 animate-[spin_14s_linear_infinite]">
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <div
                  key={deg}
                  className="absolute inset-0 rounded-full border border-primary/25"
                  style={{ transform: `rotateY(${deg}deg)`, transformStyle: "preserve-3d" }}
                />
              ))}
            </div>
            {/* Horizontal latitude bands */}
            <div className="absolute left-0 right-0 top-1/4 h-px bg-primary/20" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/30" />
            <div className="absolute left-0 right-0 top-3/4 h-px bg-primary/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-10 h-10 text-primary/70" />
            </div>
          </div>
          {/* Orbiting flags */}
          <div className="absolute inset-[-28px] animate-[spin_24s_linear_infinite]">
            {orbitFlags.map((c, i) => {
              const angle = (i / orbitFlags.length) * 360;
              return (
                <span
                  key={c.code}
                  className="absolute left-1/2 top-1/2 text-lg"
                  style={{
                    transform: `rotate(${angle}deg) translateX(96px) rotate(-${angle}deg)`,
                    marginLeft: "-9px",
                    marginTop: "-9px",
                  }}
                >
                  {c.flag}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground pb-2">
        PICK A COUNTRY — SEE ITS CREATORS
        {current.code !== "GLOBAL" && <span className="text-primary"> · NOW: {current.flag} {current.name.toUpperCase()}</span>}
      </p>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1">
        {results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No country matches "{query}".</p>
        )}
        {results.map((country) => (
          <button
            key={country.code}
            onClick={() => { onSelect(country.code); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98] ${
              selected === country.code
                ? "bg-primary/15 border border-primary/50 text-primary"
                : "bg-card border border-border text-foreground hover:border-primary/40"
            }`}
          >
            <span className="text-xl">{country.flag}</span>
            <span className="font-semibold text-sm">{country.name}</span>
            {country.code === "GLOBAL" && (
              <span className="ml-auto text-[10px] text-muted-foreground tracking-wider">EVERYWHERE</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GlobePicker;
