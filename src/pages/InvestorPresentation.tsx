import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { investorSlides, type InvestorSlide } from "@/lib/investorSlides";
import globe from "@/assets/dtt-preferred-globe-share.jpg.asset.json";

function ScaledSlide({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setScale(Math.min(entry.contentRect.width / 1920, entry.contentRect.height / 1080)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="investor-scale"><div className="investor-scaled" style={{ "--slide-scale": scale } as CSSProperties}>{children}</div></div>;
}

function Block({ number, title, children }: { number?: string; title: string; children: ReactNode }) {
  return <div className="investor-block">{number && <span className="investor-number">{number}</span>}<h3>{title}</h3><p>{children}</p></div>;
}

function Slide({ slide, index }: { slide: InvestorSlide; index: number }) {
  const image = slide.type === "cover" || slide.type === "close";
  return <article className={`investor-slide investor-${slide.type}`} aria-label={`Slide ${index + 1}: ${slide.title}`}>
    {image && <><img className="investor-art" src={globe.url} alt="DTT pink globe and galaxy" /><div className="investor-art-shade" /></>}
    <header className="investor-slide-header"><span>{slide.kicker}</span><span>DTT™</span></header>
    <div className="investor-slide-content">
      <h1>{slide.title}</h1><p className="investor-subtitle">{slide.summary}</p>
      {slide.type === "cover" && <div className="investor-cover-copy"><p>18+ CREATOR MARKETPLACE</p><p>January 1, 2027 launch target</p><span>DTT Media LLC · Pennsylvania · dropthatthing.com</span></div>}
      {slide.type === "compare" && <div className="investor-comparison"><section><h3>The friction</h3><p>Pricing that is hard to follow</p><p>Discovery buried in clutter</p><p>Creators with less control</p></section><section><h3>The DTT choice</h3><p>One token. A 14-day library.</p><p>Country + category. No hashtags.</p><p>Creator-priced custom work.</p></section></div>}
      {slide.type === "journey" && <><div className="investor-flow"><Block number="01" title="Enter">18+ consent, language and saved preferences.<br />$20 annual entry; $10 for eligible founding waitlist members.</Block><Block number="02" title="Discover">Tap-to-play teasers and a clean country-and-category News Feed.</Block><Block number="03" title="Unlock">One $25 Bit-Token unlocks one regular creator library for 14 days.</Block></div><div className="investor-band">No recurring creator subscription · Visible access countdowns · Optional custom requests</div></>}
      {slide.type === "creators" && <><div className="investor-feature-layout"><div className="investor-stat"><strong>90%</strong><span>base creator share</span><small>of the $20 token spending value</small></div><div className="investor-feature-grid"><Block title="Prepare & verify">Private drafts and human ID review before publishing.</Block><Block title="Create & protect">Cleared teasers and library media with permanent DTT branding.</Block><Block title="Connect & organize">Feed posts, share links, requests, calendar and earnings history.</Block><Block title="Make it personal">Globe and galaxy colors, BRB and exported wallpaper artwork.</Block></div></div><p className="investor-footnote">Eligible founding creators: 91/9 for life. Reviewed annual country champion: 95/5 for life.</p></>}
      {slide.type === "request" && <div className="investor-request-layout"><div><div className="investor-number">06</div><h3>menu options maximum</h3><p>Prices from $25. Included deliverable and turnaround shown upfront.</p><p>Choose a preset or propose an open idea when the creator enables it.</p><div className="investor-band">Verified payment starts the turnaround clock.</div></div><section className="investor-receipt"><h3>A $46 request</h3><dl><div><dt>Creator-set price</dt><dd>$46.00</dd></div><div><dt>Creator share · 85%</dt><dd>$39.10</dd></div><div><dt>DTT share · 15%</dt><dd>$6.90</dd></div><div><dt>Buyer service fee</dt><dd>$1.00</dd></div><div><dt>Buyer processing cover</dt><dd>$4.00</dd></div><div className="investor-total"><dt>Total checkout</dt><dd>$51.00</dd></div></dl><small>The split divides the price; it is not charged again.</small></section></div>}
      {slide.type === "economy" && <><div className="investor-flow"><Block number="$20" title="Annual entry">365-day platform entry.<br />Eligible waitlist accounts: $10 per year for life.</Block><Block number="$25" title="Single Bit-Token">$20 spending value.<br />Base DTT contribution: $5 allowance + $2 vault share, before costs.</Block><Block number="15%" title="Dollar-menu share">Plus the separately itemized $5 buyer fee. New menus stay 85/15 across tiers.</Block></div><div className="investor-band">Also: limited VIP creator passes · Future Space City advertising</div><p className="investor-footnote">Bundles: 5/$120 and 10/$230. Discounts and higher creator splits reduce token contribution; contribution is not profit.</p></>}
      {slide.type === "vip" && <><div className="investor-vip-layout"><div><div className="investor-tier"><span>PRO · 500 PLACES</span><strong>$1,500</strong><p>92/8 vault split for life</p></div><div className="investor-tier"><span>ELITE · 500 PLACES</span><strong>$3,500</strong><p>93/7 vault split for life</p></div></div><section><strong className="investor-big-money">$2.5M</strong><p>Hypothetical gross sales if all 1,000 passes sell.</p><div className="investor-sales"><span>10 Pro + 10 Elite</span><strong>$50,000</strong><span>50 Pro + 50 Elite</span><strong>$250,000</strong></div></section></div><p className="investor-footnote">Not booked revenue or guaranteed profit. Break-even requires recognized revenue above all costs; lifetime benefits, reserves and taxes need accounting review. Free interest tickets are not sales.</p></>}
      {slide.type === "trust" && <><div className="investor-feature-grid investor-trust-grid"><Block number="01" title="Adult identity">Private ID review and final human approval.</Block><Block number="02" title="Content consent">Participant identity, recording-age evidence and specific permission.</Block><Block number="03" title="Protected access">Verified payments, private delivery, watermarks and expiring links.</Block><Block number="04" title="Legal framework">DMCA process, records custodian and country-by-country review.</Block></div><p className="investor-footnote">Custom-delivery links: 30-second maximum. Controls reduce risk; they do not promise leak-proof media or blanket legal clearance.</p></>}
      {slide.type === "growth" && <><div className="investor-flow"><Block number="01" title="Build interest">Free numbered customer waiting list and qualified creator onboarding.</Block><Block number="02" title="Creator-led reach">Share links, QR codes and country-focused communities.</Block><Block number="03" title="Prove repeat use">Measure paid conversion, repeat access, request fulfillment and contribution after costs.</Block></div><div className="investor-band">Launch target: January 1, 2027 · Expand with evidence, not assumed demand.</div></>}
      {slide.type === "future" && <div className="investor-future-layout"><img src={globe.url} alt="DTT personal globe artwork" /><section><Block title="Already part of DTT">Personal globe and galaxy colors, BRB and wallpaper exports.</Block><Block title="Future concepts">Country planets, community play and Space City advertising. No funded token rewards promised.</Block><Block title="Corporate direction">DTT Media LLC today. A potential C-corporation conversion with counsel, governance and accounting oversight.</Block></section></div>}
      {slide.type === "close" && <div className="investor-close-copy"><blockquote>“I've been building different apps for the last three years, hoping something would catch.”</blockquote><p>A solid foundation for family.<br />A platform shaped by creators, fans and useful ideas.</p><a href="mailto:admin@dttmediallc.com">admin@dttmediallc.com</a><span>Investor · Partnership · DTT Space City advertising inquiries</span></div>}
    </div>
    <footer className="investor-slide-footer"><span>DTT MEDIA LLC · DISCUSSION MATERIAL · NOVEMBER 2026</span><span>{String(index + 1).padStart(2, "0")} / {investorSlides.length}</span></footer>
  </article>;
}

export default function InvestorPresentation() {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get("slide") ?? 1);
  const index = Number.isFinite(raw) ? Math.max(0, Math.min(investorSlides.length - 1, Math.floor(raw) - 1)) : 0;
  const slide = investorSlides[index];
  const print = params.has("print");
  const presenter = params.has("presenter");
  const [grid, setGrid] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [full, setFull] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const [notes, setNotes] = useState<Record<number, string>>(() => {
    try { return JSON.parse(localStorage.getItem("dtt-investor-notes") ?? "{}"); } catch { return {}; }
  });
  const startTouch = useRef<{ x: number; y: number } | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const navigate = useCallback((next: number, broadcast = true) => {
    const clamped = Math.max(0, Math.min(investorSlides.length - 1, next));
    setParams(previous => { const p = new URLSearchParams(previous); p.set("slide", String(clamped + 1)); return p; }, { replace: true });
    if (broadcast) channel.current?.postMessage({ slide: clamped });
  }, [setParams]);
  useEffect(() => {
    const c = new BroadcastChannel("dtt-investor-presenter");
    channel.current = c;
    c.onmessage = event => { if (Number.isInteger(event.data?.slide)) navigate(event.data.slide, false); };
    return () => { c.close(); channel.current = null; };
  }, [navigate]);
  useEffect(() => {
    const change = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const present = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else { try { await deckRef.current?.requestFullscreen(); } catch { setFull(true); } }
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      if (["ArrowRight", " ", "ArrowLeft", "F5"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowRight" || event.key === " ") navigate(index + 1);
      if (event.key === "ArrowLeft") navigate(index - 1);
      if (event.key.toLowerCase() === "g") setGrid(v => !v);
      if (event.key === "F5") void present();
      if (event.key === "Escape") { setGrid(false); setFull(false); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, navigate, present]);
  useEffect(() => {
    if (!print) return;
    let cancelled = false;
    void document.fonts.ready.then(async () => {
      await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)));
      if (!cancelled) window.print();
    });
    return () => { cancelled = true; };
  }, [print]);
  const resizeSidebar = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = event.clientX, width = sidebarWidth;
    const move = (e: PointerEvent) => setSidebarWidth(Math.max(0, Math.min(380, width + e.clientX - start)));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setSidebarWidth(w => w < 150 ? 0 : w); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
  };
  if (!slide) return null;
  return <div ref={deckRef} className={`investor-deck ${full ? "investor-fullscreen" : ""} ${print ? "investor-print" : ""}`} data-notranslate>
    <Helmet><title>{`${index + 1}/${investorSlides.length} — ${slide.title} · DTT Investor Presentation`}</title><meta name="description" content="DTT Media LLC investor presentation: creator and customer experience, pricing, VIP scenarios and future direction." /></Helmet>
    {print ? investorSlides.map((s, i) => <Slide key={s.type} slide={s} index={i} />) : <>
      <nav className="investor-toolbar" aria-label="Presentation tools"><a className="investor-brand" href="/">DTT<span>™</span></a><span className="investor-toolbar-label">INVESTOR BRIEF</span><div className="investor-tools"><Button variant="ghost" onClick={() => setGrid(v => !v)} aria-pressed={grid}>OVERVIEW</Button><Button variant="ghost" onClick={() => setNotesOpen(v => !v)} aria-pressed={notesOpen}>NOTES</Button><Button variant="ghost" onClick={() => window.open(`/investors?slide=${index + 1}&print`, "_blank", "noopener,noreferrer")}>EXPORT PDF</Button><Button variant="ghost" onClick={() => window.open(`/investors?slide=${index + 1}&presenter`, "dtt-presenter")}>PRESENTER</Button><Button onClick={() => void present()}>PRESENT</Button></div></nav>
      <div className="investor-workspace">
        {!grid && !presenter && <><aside className="investor-sidebar" style={{ width: sidebarWidth }} aria-label="Slide thumbnails">{investorSlides.map((s, i) => <Button key={s.type} variant="ghost" className={`investor-thumbnail ${i === index ? "selected" : ""}`} onClick={() => navigate(i)} aria-label={`Go to slide ${i + 1}: ${s.title}`} aria-current={i === index ? "page" : undefined}><div className="investor-thumb-preview"><ScaledSlide><Slide slide={s} index={i} /></ScaledSlide></div><span>{String(i + 1).padStart(2, "0")} · {s.title}</span></Button>)}</aside><div className="investor-sidebar-resize" role="separator" aria-label="Resize slide sidebar" aria-orientation="vertical" onPointerDown={resizeSidebar} /></>}
        {grid ? <div className="investor-grid">{investorSlides.map((s, i) => <Button variant="ghost" key={s.type} className="investor-grid-item" onClick={() => { navigate(i); setGrid(false); }}><div className="investor-thumb-preview"><ScaledSlide><Slide slide={s} index={i} /></ScaledSlide></div><span>{i + 1} · {s.title}</span></Button>)}</div> : <main className={`investor-main ${presenter ? "investor-presenter-view" : ""}`}>
          <div className="investor-stage" onTouchStart={e => { const t = e.touches[0]; if (t) startTouch.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={e => { const t = e.changedTouches[0], start = startTouch.current; startTouch.current = null; if (!t || !start) return; const dx = t.clientX - start.x; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(t.clientY - start.y)) navigate(index + (dx < 0 ? 1 : -1)); }}><ScaledSlide><Slide slide={slide} index={index} /></ScaledSlide></div>
          {presenter && <section className="investor-presenter-panel"><h2>UP NEXT</h2><div className="investor-thumb-preview"><ScaledSlide><Slide slide={investorSlides[Math.min(index + 1, investorSlides.length - 1)] ?? slide} index={Math.min(index + 1, investorSlides.length - 1)} /></ScaledSlide></div><p>{notes[index] ?? slide.notes}</p></section>}
          <div className="investor-navigation"><Button variant="ghost" disabled={index === 0} onClick={() => navigate(index - 1)}>PREVIOUS</Button><span aria-live="polite">{index + 1} / {investorSlides.length}</span><Button variant="ghost" disabled={index === investorSlides.length - 1} onClick={() => navigate(index + 1)}>NEXT</Button>{full && <Button variant="ghost" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); setFull(false); }}>EXIT</Button>}</div>
          {notesOpen && <section className="investor-notes"><label htmlFor="investor-notes">PRESENTER NOTES</label><textarea id="investor-notes" value={notes[index] ?? slide.notes} onChange={e => { const updated = { ...notes, [index]: e.target.value }; setNotes(updated); try { localStorage.setItem("dtt-investor-notes", JSON.stringify(updated)); } catch { /* Notes remain available in this window. */ } }} /></section>}
        </main>}
      </div>
    </>}
  </div>;
}