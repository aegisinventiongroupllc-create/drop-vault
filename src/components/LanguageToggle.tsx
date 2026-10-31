import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/i18n/I18nContext";
import type { Locale } from "@/i18n/types";
import { EXTRA_LANGUAGES, setAutoLang } from "@/lib/siteTranslate";
import { getTargetLang } from "@/components/AutoTranslator";
import { Button } from '@/components/ui/button';

const LanguageToggle = ({ prominent = false, placement = "below" }: { prominent?: boolean; placement?: "above" | "below" }) => {
  const { setLocale, locales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const target = getTargetLang();
  const label = Object.entries({ ...locales, ...EXTRA_LANGUAGES }).find(([code]) => code.toLowerCase() === target)?.[1] || target.toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const itemCls = (active: boolean) =>
    `w-full text-left px-4 py-2.5 text-xs font-bold tracking-wider transition-colors ${
      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
    }`;

  return (
    <div ref={ref} className="relative notranslate" translate="no">
      <Button variant="ghost"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border hover:border-primary/40 transition-all text-xs font-bold tracking-normal text-foreground"
        aria-label="Change language"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{prominent ? label : target.toUpperCase()}</span>
        {prominent && <span className="text-primary">LANGUAGE ▾</span>}
      </Button>

      {open && (
        <div role="menu" aria-label="Languages" className={`absolute right-0 ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"} bg-card border border-border rounded-md overflow-y-auto max-h-[60vh] shadow-xl z-50 w-56 max-w-[calc(100vw-2rem)]`}>
          {(Object.keys(locales) as Locale[]).map((l) => (
            <Button variant="ghost"
              key={l}
              onClick={() => {
                setLocale(l);
                setOpen(false);
                setAutoLang(null);
              }}
              className={`${itemCls(getTargetLang() === l)} justify-start h-auto whitespace-normal`}
            >
              {locales[l]}
            </Button>
          ))}
          <div className="border-t border-border" />
          {Object.entries(EXTRA_LANGUAGES).map(([code, label]) => (
            <Button variant="ghost"
              key={code}
              onClick={() => {
                setLocale("en");
                setOpen(false);
                setAutoLang(code);
              }}
              className={`${itemCls(getTargetLang() === code.toLowerCase())} justify-start h-auto whitespace-normal`}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageToggle;
