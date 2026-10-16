import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Which surface the globe wears.
 *  - "brand": the straight-to-the-point DTT globe — dark navy sphere, cyan country borders, faint grid.
 *  - "earth": photo-real satellite Earth with city lights on the night side.
 * The owner picks one in the admin panel; the choice is stored once and shown to everyone.
 */
export type GlobeStyle = "brand" | "earth";

const SETTING_KEY = "globe_style";
const CACHE_KEY = "dtt_globe_style";

const isStyle = (v: unknown): v is GlobeStyle => v === "brand" || v === "earth";

const readCache = (): GlobeStyle => {
  try {
    const v = localStorage.getItem(CACHE_KEY);
    if (isStyle(v)) return v;
  } catch {}
  return "brand";
};

let current: GlobeStyle = readCache();
const listeners = new Set<(s: GlobeStyle) => void>();
let inflight: Promise<void> | null = null;

/** Style this device should render right now (server value, or the last one it saw). */
export const getGlobeStyle = (): GlobeStyle => current;

/** Apply a style here and now, before the server confirms it. */
export const setGlobeStyleLocal = (style: GlobeStyle) => {
  if (!isStyle(style) || style === current) return;
  current = style;
  try {
    localStorage.setItem(CACHE_KEY, style);
  } catch {}
  listeners.forEach((l) => l(style));
};

/**
 * Read the platform-wide choice once. Falls back to this device's last known
 * value when offline or when the row hasn't been saved yet.
 */
export const loadGlobeStyle = (): Promise<void> => {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      const style = (data as { value?: { style?: unknown } } | null)?.value?.style;
      if (isStyle(style)) setGlobeStyleLocal(style);
    } catch {
      // Keep the cached look; the globe always renders.
    }
  })();
  return inflight;
};

/** Save the choice for every customer and creator. Needs the owner's admin sign-in. */
export const saveGlobeStyle = async (style: GlobeStyle): Promise<{ ok: boolean; error?: string }> => {
  if (!isStyle(style)) return { ok: false, error: "Unknown globe style." };
  setGlobeStyleLocal(style);
  try {
    const { error } = await supabase.from("app_settings").upsert({
      key: SETTING_KEY,
      value: { style },
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach the server." };
  }
};

/** Live style for any component that draws a globe. */
export const useGlobeStyle = (): GlobeStyle => {
  const [style, setStyle] = useState<GlobeStyle>(current);
  useEffect(() => {
    listeners.add(setStyle);
    if (style !== current) setStyle(current);
    loadGlobeStyle();
    return () => {
      listeners.delete(setStyle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return style;
};
