import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import type { Locale } from "@/i18n/types";

const LanguageToggle = () => {
  const { locale, setLocale, locales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary/60 border border-border hover:border-primary/40 transition-all text-xs font-bold tracking-wider text-foreground"
        aria-label="Change language"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-xl z-50 min-w-[140px]">
          {(Object.keys(locales) as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => { setLocale(l); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold tracking-wider transition-colors ${
                locale === l
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {locales[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
