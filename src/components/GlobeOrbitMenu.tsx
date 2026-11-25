import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, Crown, FileText, Flame, Gem, Heart, Inbox, MessageCircle, ShieldCheck } from "lucide-react";
import { GLOBE_DESTINATIONS, orbitPositions, type GlobeRole } from "@/lib/globeMenu";

const ICONS: Record<string, typeof Flame> = { flame: Flame, drafts: FileText, calendar: CalendarDays, requests: Inbox, verify: ShieldCheck, analytics: BarChart3, messages: MessageCircle, heart: Heart, gem: Gem, crown: Crown };

interface Props { role: GlobeRole | null; tone: string; size: number; children: ReactNode; onPick: (id: string) => void }

/** Double-tap the globe to release destination icons that orbit with it; drag to spin them. */
const GlobeOrbitMenu = ({ role, tone, size, children, onPick }: Props) => {
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(-Math.PI / 2);
  const drag = useRef<{ x: number; r: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const items = role ? GLOBE_DESTINATIONS[role] : [];

  useEffect(() => {
    if (!open || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; let prev = performance.now();
    const tick = (now: number) => {
      if (!drag.current) setRotation((r) => r - (now - prev) * 0.00025);
      prev = now; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const radiusX = Math.min(size * 0.78, (typeof window !== "undefined" ? window.innerWidth : 400) / 2 - 36);
  const positions = orbitPositions(items.length, rotation, radiusX, size * 0.32);

  return (
    <div className="relative" data-idle-interactive style={{ touchAction: "none" }}
      onPointerDown={(e) => { drag.current = { x: e.clientX, r: rotation, moved: false }; }}
      onPointerMove={(e) => {
        const d = drag.current; if (!d || !open) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 6) d.moved = true;
        setRotation(d.r - dx / 110);
      }}
      onPointerUp={(e) => {
        const d = drag.current; drag.current = null;
        if (d?.moved || !role) return;
        if ((e.target as Element).closest("[data-orbit-item]")) return;
        const now = Date.now();
        if (now - lastTap.current < 400) { lastTap.current = 0; setOpen((o) => !o); } else lastTap.current = now;
      }}>
      <div className="relative" data-testid="globe-orbit-globe">{children}</div>
      {open && positions.map((p, i) => {
        const item = items[i]; const Icon = ICONS[item.icon];
        const scale = 0.72 + (p.depth + 1) * 0.2;
        const mix = 55 + ((i * 37) % 40);
        return (
          <button key={item.id} type="button" data-orbit-item aria-label={item.label}
            onClick={() => onPick(item.id)}
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
            style={{ transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(${scale})`, zIndex: Math.round((p.depth + 1) * 10), opacity: 0.45 + (p.depth + 1) * 0.275, willChange: "transform" }}>
            <span className="flex h-12 animate-in fade-in duration-500 w-12 items-center justify-center rounded-full border backdrop-blur-sm"
              style={{ borderColor: tone, color: `color-mix(in srgb, ${tone} ${mix}%, white)`, background: `color-mix(in srgb, ${tone} 22%, transparent)`, boxShadow: `0 0 18px color-mix(in srgb, ${tone} 70%, transparent)` }}>
              <Icon className="h-6 w-6" />
            </span>
            <span className="text-[9px] font-black tracking-[0.2em] text-foreground">{item.label}</span>
          </button>
        );
      })}
      {role && !open && <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.3em] text-foreground/50">Double-tap the globe</p>}
    </div>
  );
};

export default GlobeOrbitMenu;
