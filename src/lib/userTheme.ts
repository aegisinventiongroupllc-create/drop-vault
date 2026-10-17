import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
// Personal dashboard colors, saved on this device. Display-only.
export type ThemeKey = "primary" | "background" | "card" | "foreground" | "globe" | "globeBorder" | "galaxy";
export type StarStyle = "living" | "deepfield" | "milkyway" | "cluster";
export const DEFAULT_STAR_STYLE: StarStyle = "cluster";
export type UserTheme = Partial<Record<ThemeKey, string>> & { globeNeon?: boolean; globeBorderNeon?: boolean; starStyle?: StarStyle };

export const STAR_STYLES: { id: StarStyle; label: string }[] = [
  { id: "living", label: "Living stars" },
  { id: "deepfield", label: "Deep field" },
  { id: "milkyway", label: "Milky Way" },
  { id: "cluster", label: "Star cluster" },
];

const KEY = "dtt_user_theme";
const HEX = /^#[0-9a-f]{6}$/i;
let revision = 0;
let saving = 0;
let syncedUser: string | undefined;

export const THEME_PARTS: { key: ThemeKey; label: string; vars: string[] }[] = [
  { key: "primary", label: "Buttons & highlights", vars: ["--primary", "--accent", "--ring"] },
  { key: "background", label: "Background", vars: ["--background"] },
  { key: "card", label: "Boxes & cards", vars: ["--card", "--popover"] },
  { key: "foreground", label: "Text", vars: ["--foreground", "--card-foreground"] },
  { key: "globe", label: "Globe tone", vars: ["--globe-personal-tone"] },
  { key: "globeBorder", label: "Country outlines", vars: ["--globe-border-tone"] },
  { key: "galaxy", label: "Galaxy & star color", vars: ["--galaxy-tone"] },
];

export function hexToHsl(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function validateTheme(t: unknown): UserTheme {
  if (!t || typeof t !== "object") return {};
  const values = t as Record<string, unknown>;
  const out: UserTheme = {};
  for (const p of THEME_PARTS) {
    const value = values[p.key];
    if (typeof value === "string" && HEX.test(value)) out[p.key] = value;
  }
  if (typeof values.globeNeon === "boolean") out.globeNeon = values.globeNeon;
  if (typeof values.globeBorderNeon === "boolean") out.globeBorderNeon = values.globeBorderNeon;
  if (typeof values.starStyle === "string" && STAR_STYLES.some((s) => s.id === values.starStyle)) out.starStyle = values.starStyle as StarStyle;
  return out;
}

export function loadTheme(): UserTheme {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || "{}");
    return validateTheme(t);
  } catch { return {}; }
}

export function applyTheme(theme: UserTheme = loadTheme()) {
  const root = document.documentElement;
  for (const p of THEME_PARTS) {
    const v = theme[p.key];
    for (const cssVar of p.vars) {
      if (v && HEX.test(v)) root.style.setProperty(cssVar, hexToHsl(v));
      else root.style.removeProperty(cssVar);
    }
  }
}

// Unsaved example shown on screen while someone tries colors; never stored.
let previewing: UserTheme | null = null;

/** The theme currently on screen: an unsaved example if one is active, else the saved one. */
export function activeTheme(): UserTheme {
  return previewing ?? loadTheme();
}

export function saveTheme(theme: UserTheme) {
  revision += 1;
  previewing = null;
  const safe = validateTheme(theme);
  localStorage.setItem(KEY, JSON.stringify(safe));
  applyTheme(safe);
  window.dispatchEvent(new Event("dtt-theme"));
}

/** Live example only: applies on screen so the person can judge it, saves nothing. */
export function previewTheme(theme: UserTheme) {
  revision += 1;
  previewing = validateTheme(theme);
  applyTheme(previewing);
  window.dispatchEvent(new Event("dtt-theme"));
}

export function usePersonalGlobe() {
  const [theme, setTheme] = useState(activeTheme);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const update = () => setTheme(activeTheme());
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    window.addEventListener("dtt-theme", update);
    media.addEventListener("change", motion);
    return () => { window.removeEventListener("dtt-theme", update); media.removeEventListener("change", motion); };
  }, []);
  return { tone: theme.globe, neon: theme.globeNeon === true, borderTone: theme.globeBorder, borderNeon: theme.globeBorderNeon === true, galaxyTone: theme.galaxy, starStyle: theme.starStyle ?? DEFAULT_STAR_STYLE, reduced };
}

// ---- Account sync: colors follow the person to every device ----

export async function saveThemeToAccount(theme: UserTheme) {
  saving += 1;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const safe = validateTheme(theme);
    const pendingKey = `${KEY}_pending_${user.id}`;
    localStorage.setItem(pendingKey, JSON.stringify(safe));
    const { error } = await supabase.from("profiles").update({ ui_theme: safe as never }).eq("user_id", user.id);
    if (!error) localStorage.removeItem(pendingKey);
  } finally { saving -= 1; }
}

export function startThemeSync() {
  const pull = async (uid: string | undefined) => {
    if (!uid || saving || syncedUser === uid) return;
    syncedUser = uid;
    const pending = localStorage.getItem(`${KEY}_pending_${uid}`);
    if (pending) {
      try { saveTheme(validateTheme(JSON.parse(pending))); } catch {}
      return;
    }
    const before = revision;
    const { data } = await supabase.from("profiles").select("ui_theme").eq("user_id", uid).maybeSingle();
    const t = (data as { ui_theme?: UserTheme } | null)?.ui_theme;
    if (before !== revision || saving) return;
    if (t && typeof t === "object") {
      localStorage.setItem(KEY, JSON.stringify(t));
      applyTheme(loadTheme());
      window.dispatchEvent(new Event("dtt-theme"));
    }
  };
  supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") void pull(session?.user?.id);
    if (evt === "SIGNED_OUT") { syncedUser = undefined; localStorage.removeItem(KEY); applyTheme({}); window.dispatchEvent(new Event("dtt-theme")); }
  });
}
