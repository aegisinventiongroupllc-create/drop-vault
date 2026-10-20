import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeTranslations } from '@/lib/translationCache';
import { savedUiTranslations, languageDirection } from '@/lib/uiTranslation';

/**
 * Translates every visible word on screen into the visitor's own language
 * (browser/phone language, or the one they picked). Results are cached
 * locally and on the server so each phrase is translated only once.
 */
const PICK_KEY = "dtt_auto_lang";

export function getTargetLang(): string {
  const picked = localStorage.getItem(PICK_KEY) || localStorage.getItem("dtt_locale");
  const raw = (picked || navigator.language || "en").toLowerCase();
  const base = raw.split("-")[0];
  // Keep regional variants only where they matter.
  if (raw.startsWith("zh")) return raw.includes("tw") || raw.includes("hk") ? "zh-tw" : "zh-cn";
  if (raw === "pt-br") return "pt-br";
  return base;
}

// Inputs have no text children: translate their labels/placeholders, never their values.
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG"]);
const HAS_LETTERS = /\p{L}{2,}/u;
const BRAND_ONLY = /^(DROP|THAT|THING|DTT|DROPTHATTHING|DROP THAT THING)$/i;
const ATTRS = ["placeholder", "aria-label", "title"] as const;

const AutoTranslator = () => {
  useEffect(() => {
    const lang = getTargetLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = languageDirection(lang);
    if (lang === "en") return;

    const cacheKey = `dtt_tr_v2_${lang}`;
    let cache: Record<string, string> = {};
    try { cache = sanitizeTranslations(JSON.parse(localStorage.getItem(cacheKey) || "{}")); } catch { cache = {}; }
    cache = { ...cache, ...savedUiTranslations(lang) };
    const translatedOut = new Set<string>(Object.values(cache));
    const pending = new Set<string>();
    const inflight = new Set<string>();
    let timer: number | undefined;
    let disposed=false;
    let flushing=false;
    const attempts=new Map<string,number>();
    let signedIn = false;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      signedIn = Boolean(session);
      if (signedIn && pending.size) schedule();
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (disposed) return;
      signedIn = Boolean(data.session);
      if (signedIn && pending.size) schedule();
    });

    const skip = (el: Element | null) => {
      for (let e = el; e; e = e.parentElement) {
        if (SKIP_TAGS.has(e.tagName) || e.classList.contains("notranslate") || e.getAttribute("translate") === "no") return true;
      }
      return false;
    };

    const want = (s: string) => {
      const t = s.trim();
      return !BRAND_ONLY.test(t) && t.length > 1 && t.length <= 600 && HAS_LETTERS.test(t) && !translatedOut.has(t) && !/^[\w.+-]+@[\w.-]+$/.test(t) && !/^https?:/.test(t);
    };

    const applyText = (node: Text) => {
      const raw = node.nodeValue || "";
      const t = raw.trim();
      if (!want(t)) return;
      if (cache[t]) node.nodeValue = raw.replace(t, cache[t]);
      else if (!inflight.has(t) && (attempts.get(t)??0)<3) pending.add(t);
    };

    const applyAttrs = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v || !want(v)) continue;
        if (cache[v.trim()]) el.setAttribute(a, cache[v.trim()]);
        else if (!inflight.has(v.trim()) && (attempts.get(v.trim())??0)<3) pending.add(v.trim());
      }
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        if (!skip(root.parentElement)) applyText(root as Text);
        return;
      }
      if (!(root instanceof Element) || skip(root)) return;
      applyAttrs(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let n: Node | null = walker.nextNode();
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) {
          if (!skip(n.parentElement)) applyText(n as Text);
        } else if (!skip(n as Element)) applyAttrs(n as Element);
        n = walker.nextNode();
      }
    };

    const flush = async () => {
      if(flushing||disposed||!signedIn)return;
      const batch = Array.from(pending).slice(0, 60);
      batch.forEach((b) => { pending.delete(b); inflight.add(b); });
      if (!batch.length) return;
      flushing=true;
      batch.forEach(b=>attempts.set(b,(attempts.get(b)??0)+1));
      try {
        const { data,error } = await supabase.functions.invoke("translate-text", { body: { lang, texts: batch } });
        if(disposed)return;
        if(error||data?.error)throw Error('Translation unavailable');
        const tr = sanitizeTranslations(data?.translations);
        for (const [k, v] of Object.entries(tr)) { cache[k] = v; translatedOut.add(v); }
        cache=sanitizeTranslations(cache);
        try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* full */ }
        scan(document.body);
      } catch { /* keep English on failure */ }
      batch.forEach((b) => inflight.delete(b));
      flushing=false;
      batch.forEach(b=>{if(!cache[b]&&(attempts.get(b)??0)<3)pending.add(b);});
      if (pending.size) {window.clearTimeout(timer);timer=window.setTimeout(()=>void flush(),1000*Math.max(...batch.map(b=>attempts.get(b)??1)));}
    };

    const schedule = () => {
      if(flushing||disposed)return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { void flush(); }, 250);
    };

    scan(document.body);
    schedule();

    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") scan(m.target);
        else if (m.type === "attributes") { if (m.target instanceof Element && !skip(m.target)) applyAttrs(m.target); }
        else m.addedNodes.forEach(scan);
      }
      if (pending.size) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => { disposed=true;obs.disconnect(); authListener.subscription.unsubscribe(); window.clearTimeout(timer); };
  }, []);

  return null;
};

export default AutoTranslator;
