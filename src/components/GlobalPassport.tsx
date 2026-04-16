import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "GLOBAL", name: "Worldwide", flag: "🌍" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
];

interface GlobalPassportProps {
  selected: string;
  onSelect: (code: string) => void;
}

const GlobalPassport = ({ selected, onSelect }: GlobalPassportProps) => {
  const [open, setOpen] = useState(false);
  const current = COUNTRIES.find(c => c.code === selected) ?? COUNTRIES[0];

  const handleSelect = async (code: string) => {
    onSelect(code);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-secondary/80 border border-border rounded-full px-3 py-1.5 text-xs font-bold tracking-wider hover:border-primary/50 transition-all"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="text-foreground">{current.code === "GLOBAL" ? "GLOBAL" : current.code}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-56 max-h-72 overflow-y-auto scrollbar-hide">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                onClick={() => handleSelect(country.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all hover:bg-secondary/50 ${
                  selected === country.code ? "bg-primary/10 text-primary" : "text-foreground"
                }`}
              >
                <span className="text-base">{country.flag}</span>
                <span className="font-medium">{country.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalPassport;
