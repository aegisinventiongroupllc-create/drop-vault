import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "INPUT"]);
const HAS_LETTERS = /\p{L}{2,}/u;
const BRAND_ONLY = /^(DROP|THAT|THING|DTT|DROPTHATTHING|DROP THAT THING)$/i;
const ATTRS = ["placeholder", "aria-label", "title"] as const;

const AutoTranslator = () => {
  useEffect(() => {
    const lang = getTargetLang();
    document.documentElement.lang = lang;
    if (lang === "en") return;

    const cacheKey = `dtt_tr_${lang}`;
    let cache: Record<string, string> = {};
    try { cache = JSON.parse(localStorage.getItem(cacheKey) || "{}"); } catch { cache = {}; }
    const translatedOut = new Set<string>(Object.values(cache));
    const pending = new Set<string>();
    const inflight = new Set<string>();
    let timer: number | undefined;

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
      else if (!inflight.has(t)) pending.add(t);
    };

    const applyAttrs = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v || !want(v)) continue;
        if (cache[v.trim()]) el.setAttribute(a, cache[v.trim()]);
        else if (!inflight.has(v.trim())) pending.add(v.trim());
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
      const batch = Array.from(pending).slice(0, 60);
      batch.forEach((b) => { pending.delete(b); inflight.add(b); });
      if (!batch.length) return;
      try {
        const { data } = await supabase.functions.invoke("translate-text", { body: { lang, texts: batch } });
        const tr: Record<string, string> = data?.translations || {};
        for (const [k, v] of Object.entries(tr)) { cache[k] = v; translatedOut.add(v); }
        try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* full */ }
        scan(document.body);
      } catch { /* keep English on failure */ }
      batch.forEach((b) => inflight.delete(b));
      if (pending.size) schedule();
    };

    const schedule = () => {
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
    return () => { obs.disconnect(); window.clearTimeout(timer); };
  }, []);

  return null;
};

export default AutoTranslator;
