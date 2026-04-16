import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Locale, Translations } from "./types";
import en from "./en";
import es from "./es";
import pt from "./pt";
import fr from "./fr";

const LOCALES: Record<Locale, Translations> = { en, es, pt, fr };

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
};

const STORAGE_KEY = "dtt_locale";

function detectLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in LOCALES) return saved as Locale;

  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  if (browserLang in LOCALES) return browserLang as Locale;
  return "en";
}

interface I18nContextValue {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALE_LABELS;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = LOCALES[locale];

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, locales: LOCALE_LABELS }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};

export { LOCALE_LABELS };
