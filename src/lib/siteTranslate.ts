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

const setCookie = (val: string) => {
  const host = window.location.hostname;
  document.cookie = `googtrans=${val};path=/`;
  document.cookie = `googtrans=${val};path=/;domain=${host}`;
  const root = host.split(".").slice(-2).join(".");
  document.cookie = `googtrans=${val};path=/;domain=.${root}`;
};

export const setAutoLang = (lang: string | null) => {
  if (lang) {
    localStorage.setItem(KEY, lang);
    setCookie(`/auto/${lang}`);
  } else {
    localStorage.removeItem(KEY);
    setCookie("");
    document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
  window.location.reload();
};

export const initAutoTranslate = () => {
  const lang = getAutoLang();
  if (!lang || document.getElementById("dtt-tx-script")) return;
  setCookie(`/auto/${lang}`);
  const host = document.createElement("div");
  host.id = "google_translate_element";
  host.style.display = "none";
  document.body.appendChild(host);
  (window as unknown as Record<string, unknown>).dttTxInit = () => {
    const g = (window as unknown as { google?: any }).google;
    if (g?.translate) new g.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
  };
  const s = document.createElement("script");
  s.id = "dtt-tx-script";
  s.src = "https://translate.google.com/translate_a/element.js?cb=dttTxInit";
  document.body.appendChild(s);
};

/** Country name in the visitor's language. */
export const countryName = (code: string, fallback: string): string => {
  try {
    const lang = getAutoLang() || localStorage.getItem("dtt_locale") || navigator.language || "en";
    return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()) || fallback;
  } catch {
    return fallback;
  }
};
