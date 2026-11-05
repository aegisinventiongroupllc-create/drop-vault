import { useEffect, useRef, useState } from "react";
import EntryPassGlobe, { ENTRY_GLOBE } from "@/components/EntryPassGlobe";
import GalaxyReel from "@/components/GalaxyReel";
import { getTargetLang } from "@/components/AutoTranslator";
import skyCluster from "@/assets/brb/stars-cluster.jpg";
import "./launch-intro.css";

/** Saved caption translations — no AI calls, readable before sign-in. */
export const INTRO_CAPTIONS: Record<string, string> = {
  en: "Tap here to enter", es: "Toca aquí para entrar", pt: "Toque aqui para entrar",
  fr: "Touchez ici pour entrer", de: "Hier tippen zum Betreten", it: "Tocca qui per entrare",
  ru: "Нажмите здесь, чтобы войти", ar: "اضغط هنا للدخول", hi: "प्रवेश के लिए यहाँ टैप करें",
  zh: "轻触此处进入", ko: "여기를 탭하여 입장", tr: "Girmek için buraya dokunun",
  nl: "Tik hier om binnen te gaan", pl: "Dotknij tutaj, aby wejść", id: "Ketuk di sini untuk masuk",
  fil: "I-tap dito para pumasok",
};

/** Tagline under the title — saved translations only, never AI. */
export const INTRO_TAGLINES: Record<string, string> = {
  en: "No subscriptions. No pay-per-view. Just simple Bit-Tokens.",
  es: "Sin suscripciones. Sin pago por visión. Solo Bit-Tokens simples.",
  pt: "Sem assinaturas. Sem pagamento por visualização. Apenas Bit-Tokens simples.",
  fr: "Pas d'abonnements. Pas de pay-per-view. Juste de simples Bit-Tokens.",
  de: "Keine Abos. Kein Pay-per-View. Einfach nur Bit-Tokens.",
  it: "Nessun abbonamento. Nessun pay-per-view. Solo semplici Bit-Tokens.",
  ru: "Без подписок. Без платы за просмотр. Только простые Bit-Tokens.",
  ar: "بلا اشتراكات. بلا دفع عند المشاهدة. فقط رموز Bit-Tokens بسيطة.",
  hi: "कोई सदस्यता नहीं। कोई पे-पर-व्यू नहीं। बस सरल बिट-टोकन।",
  zh: "无订阅。无按次付费。只需简单的 Bit-Tokens。",
  ko: "구독도, 건당 결제도 없습니다. 간단한 비트 토큰만 있으면 됩니다.",
  tr: "Abonelik yok. İzleme başına ödeme yok. Sadece basit Bit-Tokens.",
  nl: "Geen abonnementen. Geen pay-per-view. Gewoon eenvoudige Bit-Tokens.",
  pl: "Bez subskrypcji. Bez opłat za obejrzenie. Po prostu proste Bit-Tokensy.",
  id: "Tanpa langganan. Tanpa bayar per tontonan. Cukup Bit-Tokens sederhana.",
  fil: "Walang subscription. Walang bayad kada panonood. Simpleng Bit-Tokens lang.",
};

/** Small 18+ adult-content label — includes the 18+ marker in every language. */
export const INTRO_ADULT: Record<string, string> = {
  en: "18+ Adult creator content",
  es: "18+ Contenido para adultos de creadores",
  pt: "18+ Conteúdo adulto de criadores",
  fr: "18+ Contenu pour adultes de créateurs",
  de: "18+ Erwachseneninhalte von Creators",
  it: "18+ Contenuti per adulti di creator",
  ru: "18+ Контент для взрослых от авторов",
  ar: "18+ محتوى للبالغين من المبدعين",
  hi: "18+ निर्माताओं की वयस्क सामग्री",
  zh: "18+ 成人创作者内容",
  ko: "18+ 성인 크리에이터 콘텐츠",
  tr: "18+ Yetişkin içerik üreticilerinin içeriği",
  nl: "18+ Volwassenencontent van makers",
  pl: "18+ Treści dla dorosłych od twórców",
  id: "18+ Konten dewasa dari kreator",
  fil: "18+ Adult na nilalaman mula sa mga creator",
};

const pickCaption = (dict: Record<string, string>, lang: string): string => {
  const lower = lang.toLowerCase();
  const base = lower.split("-")[0];
  return dict[lower] ?? dict[base] ?? dict.en;
};

export function introCaptions(lang: string): string {
  return pickCaption(INTRO_CAPTIONS, lang);
}

export function introTaglines(lang: string): string {
  return pickCaption(INTRO_TAGLINES, lang);
}

export function introAdultLabels(lang: string): string {
  return pickCaption(INTRO_ADULT, lang);
}

// Start fetching the galaxy photo the moment the app loads.
let skyReady = false;
const skyWaiters = new Set<() => void>();
if (typeof window !== "undefined") {
  const img = new Image();
  const done = () => { skyReady = true; skyWaiters.forEach((f) => f()); skyWaiters.clear(); };
  img.onload = () => (img.decode ? img.decode().catch(() => {}).then(done) : done());
  img.onerror = done;
  img.src = skyCluster;
}
const globeSize = () => Math.round(Math.max(220, Math.min(innerWidth * 0.82, innerHeight * 0.58, 560)));

function Sparkles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    resize();
    addEventListener("resize", resize);
    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.3,
      s: Math.random() * 4 + 2, p: Math.random() * Math.PI * 2, z: Math.random(),
    }));
    let shoot = { x: 0, y: 0, t: -1 };
    let raf = 0;
    const draw = (now: number) => {
      const w = c.width, h = c.height, t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        // slow warp drift outward from center: the galaxy "breathes"
        const k = 1 + ((t * 0.02 * (st.z + 0.3)) % 0.25);
        const x = (0.5 + (st.x - 0.5) * k) * w, y = (0.5 + (st.y - 0.5) * k) * h;
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * st.s + st.p));
        const r = st.r * dpr;
        ctx.globalAlpha = a;
        ctx.fillStyle = st.z > 0.7 ? "#ffe3f3" : "#ffffff";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (st.r > 1.4 && a > 0.85) { // diffraction glint
          ctx.globalAlpha = (a - 0.85) * 4;
          ctx.fillRect(x - r * 6, y - 0.5 * dpr, r * 12, dpr);
          ctx.fillRect(x - 0.5 * dpr, y - r * 6, dpr, r * 12);
        }
      }
      if (shoot.t < 0 && Math.random() < 0.012) shoot = { x: Math.random() * w, y: Math.random() * h * 0.5, t: 0 };
      if (shoot.t >= 0) {
        shoot.t += 0.025;
        const len = 140 * dpr, px = shoot.x + shoot.t * 420 * dpr, py = shoot.y + shoot.t * 220 * dpr;
        const g = ctx.createLinearGradient(px, py, px - len, py - len * 0.52);
        g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(1, "rgba(255,80,180,0)");
        ctx.globalAlpha = 1 - shoot.t; ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - len, py - len * 0.52); ctx.stroke();
        if (shoot.t >= 1) shoot.t = -1;
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

/**
 * Opening screen everyone sees on load: living pink galaxy, the DTT globe
 * flies in from deep space and settles, then "Drop That Thing" pulses with it.
 */
export default function LaunchIntro() {
  const [show, setShow] = useState(() => typeof window !== "undefined" && !new URLSearchParams(location.search).has("nointro"));
  const [leaving, setLeaving] = useState(false);
  const [lang, setLang] = useState(() => getTargetLang());
  const [ready, setReady] = useState(skyReady);
  const [size, setSize] = useState(() => (typeof window !== "undefined" ? globeSize() : 300));
  useEffect(() => {
    if (ready) return;
    const go = () => setReady(true);
    skyWaiters.add(go);
    const cap = setTimeout(go, 5000); // slow networks still get the intro
    return () => { skyWaiters.delete(go); clearTimeout(cap); };
  }, [ready]);
  useEffect(() => {
    const r = () => setSize(globeSize());
    addEventListener("resize", r);
    return () => removeEventListener("resize", r);
  }, []);
  const reduced = typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const replay = () => { setLeaving(false); setShow(false); requestAnimationFrame(() => setShow(true)); };
    window.addEventListener("dtt:replay-intro", replay);
    return () => window.removeEventListener("dtt:replay-intro", replay);
  }, []);

  useEffect(() => {
    if (!show) return;
    const id = setInterval(() => setLang(getTargetLang()), 500);
    return () => clearInterval(id);
  }, [show, reduced]);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShow(false), 700);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!show) return null;
  const tap = introCaptions(lang);
  const rtl = ["ar", "he", "fa", "ur"].includes(lang.split("-")[0]);

  return (
    <div
      className={`dtt-intro fixed inset-0 z-[230] flex items-center justify-center overflow-hidden bg-background ${leaving ? "dtt-intro-out" : ""} ${reduced ? "dtt-intro-still" : ""} ${ready ? "dtt-intro-ready" : ""}`}
      role="status" aria-label="Drop That Thing™"
      onClick={(e) => { if (!(e.target as Element).closest("[data-intro-keep]")) setLeaving(true); }}
    >
      <div className="dtt-intro-sky absolute inset-0" aria-hidden>
        <GalaxyReel scope="brb" seconds={240} styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} />
      </div>
      <div className="dtt-intro-core absolute inset-0" aria-hidden />
      <div className="dtt-intro-nebula absolute inset-0" aria-hidden />
      {!reduced && <Sparkles />}
      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="dtt-intro-globe"><EntryPassGlobe size={size} solid sharp /></div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="dtt-intro-title notranslate font-black uppercase text-primary" translate="no">Drop That Thing™</h1>
          <p dir={rtl ? "rtl" : "ltr"} className="dtt-intro-tagline notranslate max-w-xs text-[11px] font-semibold uppercase leading-relaxed tracking-[0.18em] text-foreground/80" translate="no">
            {introTaglines(lang)}
          </p>
          <span dir={rtl ? "rtl" : "ltr"} className="dtt-intro-adult notranslate rounded-full border border-primary/40 bg-background/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary/90" translate="no">
            {introAdultLabels(lang)}
          </span>
        </div>
        <p dir={rtl ? "rtl" : "ltr"} className="dtt-intro-caption notranslate text-sm font-bold uppercase tracking-[0.3em] text-foreground/85" translate="no">
          {tap}
        </p>
      </div>
    </div>
  );
}
