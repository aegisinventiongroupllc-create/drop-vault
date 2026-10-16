// Whole-site automatic translation for any language beyond the hand-written ones.
// Uses the browser translation engine via a hidden widget; its branding is hidden in CSS.
export const EXTRA_LANGUAGES: Record<string, string> = {
  de: "Deutsch", it: "Italiano", nl: "Nederlands", pl: "Polski", ru: "Русский",
  uk: "Українська", tr: "Türkçe", ar: "العربية", he: "עברית", hi: "हिन्दी",
  ja: "日本語", ko: "한국어", "zh-CN": "中文 (简体)", "zh-TW": "中文 (繁體)",
  th: "ไทย", vi: "Tiếng Việt", id: "Bahasa Indonesia", ms: "Bahasa Melayu",
  tl: "Filipino", sv: "Svenska", no: "Norsk", da: "Dansk", fi: "Suomi",
  el: "Ελληνικά", cs: "Čeština", ro: "Română", hu: "Magyar", bg: "Български",
  sr: "Српски", hr: "Hrvatski", sw: "Kiswahili", af: "Afrikaans",
};

const KEY = "dtt_auto_lang";

export const getAutoLang = (): string | null => localStorage.getItem(KEY);

// Picking a language stores it; the in-app AutoTranslator applies it on reload.
export const setAutoLang = (lang: string | null) => {
  if (lang) localStorage.setItem(KEY, lang);
  else localStorage.removeItem(KEY);
  // Clear any leftover cookie from the old third-party widget.
  document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.location.reload();
};

/** Kept as a no-op for older imports; translation runs in AutoTranslator. */
export const initAutoTranslate = () => {};

/** Country name in the visitor's language. */
export const countryName = (code: string, fallback: string): string => {
  try {
    const lang = getAutoLang() || localStorage.getItem("dtt_locale") || navigator.language || "en";
    return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
};
