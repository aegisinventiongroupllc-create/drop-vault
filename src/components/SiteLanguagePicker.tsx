import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LanguageToggle from "@/components/LanguageToggle";

/**
 * Global native-name language selector. Draggable: creators, customers and
 * visitors can pull it anywhere on screen and it remembers the spot. Default
 * anchors stay clear of titles and navigation on every page.
 */
const POS_KEY = "dtt-language-picker-position";

type PickerPos = { fx: number; fy: number };

const loadPos = (): PickerPos | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(POS_KEY) || "null") as PickerPos | null;
    if (parsed && typeof parsed.fx === "number" && typeof parsed.fy === "number") return parsed;
  } catch { /* ignore broken saves */ }
  return null;
};

const MARGIN = 12;

export default function SiteLanguagePicker() {
  const [signedIn, setSignedIn] = useState(false);
  const [pos, setPos] = useState<PickerPos | null>(loadPos);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 170, h: 44 });
  const dragRef = useRef<{ id: number; sx: number; sy: number; sl: number; st: number; moved: boolean } | null>(null);
  const lastPosRef = useRef<PickerPos | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      const rect = pillRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) sizeRef.current = { w: rect.width, h: rect.height };
    };
    measure();
    window.addEventListener("resize", measure);
    return () => { window.removeEventListener("resize", measure); };
  }, []);

  const size = sizeRef.current;
  const clamp = (left: number, top: number) => ({
    left: Math.min(Math.max(left, MARGIN), Math.max(MARGIN, viewport.w - size.w - MARGIN)),
    top: Math.min(Math.max(top, MARGIN), Math.max(MARGIN, viewport.h - size.h - MARGIN)),
  });
  // Defaults chosen to overlap nothing: bottom-right corner; above the nav bar when signed in.
  const anchored = pos
    ? clamp(pos.fx * viewport.w, pos.fy * viewport.h)
    : clamp(
        viewport.w - size.w - MARGIN,
        signedIn ? viewport.h - size.h - 96 : viewport.h - size.h - MARGIN,
      );
  const openAbove = anchored.top + size.h + 320 > viewport.h;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, sl: anchored.left, st: anchored.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; setDragging(true); }
    const next = clamp(drag.sl + dx, drag.st + dy);
    lastPosRef.current = { fx: next.left / viewport.w, fy: next.top / viewport.h };
    setPos(lastPosRef.current);
  };

  const endDrag = (activate: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) return;
    if (drag.moved) {
      if (lastPosRef.current) {
        try { localStorage.setItem(POS_KEY, JSON.stringify(lastPosRef.current)); } catch { /* ignore */ }
      }
      suppressClickRef.current = true;
      return;
    }
    if (!activate) return;
    // Pointer capture retargets the native click to this container, so a plain
    // tap activates the language button explicitly; the stray click is suppressed.
    pillRef.current?.querySelector<HTMLButtonElement>("button")?.click();
    suppressClickRef.current = true;
  };

  return (
    <div
      ref={pillRef}
      className={`fixed z-[240] notranslate ${dragging ? "cursor-grabbing select-none" : "cursor-grab"}`}
      style={{
        left: anchored.left,
        top: anchored.top,
        touchAction: menuOpen ? "auto" : "none",
        transition: dragging ? "none" : "left .25s ease, top .25s ease",
      }}
      translate="no"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => endDrag(true)}
      onPointerCancel={() => endDrag(false)}
      onClickCapture={(e) => {
        if (!suppressClickRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      <LanguageToggle
        prominent
        placement={openAbove ? "above" : "below"}
        onOpenChange={setMenuOpen}
      />
    </div>
  );
}
