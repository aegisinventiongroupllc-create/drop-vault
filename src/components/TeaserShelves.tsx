import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfileAvatar from "@/components/ProfileAvatar";
import type { VideoItem } from "@/components/DiscoveryFeed";
import { teaserGateTime } from "@/lib/teaserGate";
import { readBrowsePosition, saveBrowsePosition, teaserTapAction } from "@/lib/teaserBrowse";
import dttCoin from "@/assets/dtt-reward-coin.png";

export function ShelfTeaser({ item, active, onPlay, onCreatorClick, unlocked }: {
  item: VideoItem; active: boolean; onPlay: () => void; onCreatorClick: (name: string) => void; unlocked: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const tile = useRef<HTMLDivElement>(null);
  const lastTap = useRef<number | null>(null);
  const [gate, setGate] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (active && !gate) video.current?.play().catch(() => setError(true));
    else video.current?.pause();
  }, [active, gate]);
  useEffect(() => {
    const element = tile.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.current?.pause(); }, { threshold: 0.3 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const tap = () => {
    const now = Date.now();
    if (teaserTapAction(lastTap.current, now) === "library") {
      lastTap.current = null;
      video.current?.pause();
      onCreatorClick(item.creator);
    } else {
      lastTap.current = now;
      setError(false);
      onPlay();
      if (active && !gate) video.current?.play().catch(() => setError(true));
    }
  };
  return <article className="w-44 shrink-0 snap-start sm:w-56">
    <div ref={tile} className={`relative aspect-[3/4] overflow-hidden rounded-lg border bg-card ${active ? "border-primary" : "border-border"}`}>
      <Button variant="ghost" aria-label={`Play ${item.title} by @${item.creator}`} onClick={tap} className="absolute inset-0 h-full w-full p-0 rounded-none touch-manipulation">
        {item.mediaType === "photo" ? <img loading="lazy" src={item.videoUrl} alt={item.title} className="h-full w-full object-cover" /> : <>
          <div className="absolute inset-0 flex items-center justify-center bg-secondary"><ProfileAvatar config={item.creatorAvatar} creatorPhotoPath={item.creatorPhotoPath} label={item.creator} className="h-28 w-28" /></div>
          <video ref={video} src={active ? item.videoUrl : undefined} playsInline preload="none" className={`absolute inset-0 h-full w-full object-cover ${active ? "opacity-100" : "opacity-0"}`} onTimeUpdate={() => {
            const current = video.current;
            if (!current || unlocked) return;
            const stop = teaserGateTime(current.duration);
            if (stop !== null && current.currentTime >= stop) { current.pause(); setGate(true); }
          }} onEnded={() => { if (!unlocked) setGate(true); }} onError={() => setError(true)} />
        </>}
        <span aria-hidden="true" className={`absolute inset-0 pointer-events-none teaser-viewport teaser-frame-${item.frame || "none"}`}><span className="teaser-decoration absolute inset-0" /></span>
        <img src={dttCoin} alt="" className="absolute top-3 right-3 h-7 w-7 object-contain opacity-60" />
      </Button>
      {(gate || error) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 px-3 text-center">
        <p className="text-sm font-semibold">{error ? "Teaser unavailable" : item.vault === "men" ? "UNLOCK HIS LIBRARY" : "UNLOCK HER LIBRARY"}</p>
        {!error && <p className="text-xs text-muted-foreground">1 Bit-Token · 14-day access</p>}
        <Button variant="neon" size="sm" className="h-auto whitespace-normal py-2" onClick={() => onCreatorClick(item.creator)}>VIEW LIBRARY</Button>
      </div>}
    </div>
    <h3 className="mt-2 truncate text-sm font-semibold" translate="no">{item.title}</h3>
    <Button variant="link" className="h-auto max-w-full justify-start truncate p-0 text-xs text-muted-foreground" onClick={() => onCreatorClick(item.creator)}><span translate="no" className="truncate">@{item.creator}</span></Button>
  </article>;
}

export default function TeaserShelves({ items, viewerId, scope, unlocked, onCreatorClick, loading, children }: {
  items: VideoItem[]; viewerId: string | null; scope: string; unlocked: Set<string>; onCreatorClick: (name: string) => void; loading: boolean; children?: React.ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const positions = useRef(readBrowsePosition(viewerId, scope));
  const tags = Array.from(new Set(items.flatMap(item => item.tags ?? []))).slice(0, 12);
  const rows = [{ title: "New arrivals", items }, ...((tags.length ? tags : ["Cosplay", "Fitness", "Lifestyle"]).map(title => ({ title, items: items.filter(item => item.tags?.includes(title)) })))];
  useEffect(() => {
    positions.current = readBrowsePosition(viewerId, scope);
    setActive(null);
    const element = container.current;
    if (!element) return;
    element.scrollTop = positions.current.top;
    element.querySelectorAll<HTMLElement>("[data-shelf]").forEach(row => { row.scrollLeft = positions.current.rows[row.dataset.shelf ?? ""] ?? 0; });
    return () => saveBrowsePosition(viewerId, scope, positions.current);
  }, [viewerId, scope, loading]);
  const save = () => saveBrowsePosition(viewerId, scope, positions.current);
  return <div ref={container} className="h-[100dvh] overflow-y-auto bottom-nav-scroll-area pt-40 sm:pt-44" onScroll={event => { positions.current.top = event.currentTarget.scrollTop; save(); }}>
    <div className="mx-auto max-w-7xl space-y-7 px-4 pb-6 sm:px-8">
      <div><h2 className="font-display text-xl font-bold text-foreground">{scope.startsWith("men") ? "MEN’S VAULT" : "WOMEN’S VAULT"}</h2></div>
      {rows.map((row, index) => <section key={row.title} aria-label={row.title}>
        <h2 className="mb-3 text-base font-semibold text-foreground">{row.title}</h2>
        <div data-shelf={row.title} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3" onScroll={event => { positions.current.rows[row.title] = event.currentTarget.scrollLeft; save(); }}>
          {row.items.map(item => <ShelfTeaser key={item.id} item={item} active={active === item.id} onPlay={() => setActive(item.id)} onCreatorClick={onCreatorClick} unlocked={!!item.creatorId && (unlocked.has(item.creatorId) || viewerId === item.creatorId)} />)}
          {!row.items.length && Array.from({ length: 5 }, (_, slot) => <article key={slot} className="w-44 shrink-0 snap-start sm:w-56">
            <div className={`relative aspect-[3/4] flex flex-col items-center justify-center gap-5 overflow-hidden rounded-lg border border-border ${index % 2 ? "bg-secondary" : "bg-card"}`}>
              <img src={dttCoin} alt="DTT" className="h-20 w-20 object-contain opacity-70" />
              <p className="text-sm font-semibold text-muted-foreground">{loading ? "Loading…" : "Coming soon"}</p>
            </div>
          </article>)}
        </div>
      </section>)}
      {children}
    </div>
  </div>;
}