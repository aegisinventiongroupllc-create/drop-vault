import { supabase } from "@/integrations/supabase/client";
// Personal dashboard colors, saved on this device. Display-only.
export type ThemeKey = "primary" | "background" | "card" | "foreground";
export type UserTheme = Partial<Record<ThemeKey, string>>;

const KEY = "dtt_user_theme";
const HEX = /^#[0-9a-f]{6}$/i;

export const THEME_PARTS: { key: ThemeKey; label: string; vars: string[] }[] = [
  { key: "primary", label: "Buttons & highlights", vars: ["--primary", "--accent", "--ring"] },
  { key: "background", label: "Background", vars: ["--background"] },
  { key: "card", label: "Boxes & cards", vars: ["--card", "--popover"] },
  { key: "foreground", label: "Text", vars: ["--foreground", "--card-foreground"] },
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

export function loadTheme(): UserTheme {
  try {
    const t = JSON.parse(localStorage.getItem(KEY) || "{}");
    const out: UserTheme = {};
    for (const p of THEME_PARTS) if (typeof t[p.key] === "string" && HEX.test(t[p.key])) out[p.key] = t[p.key];
    return out;
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

export function saveTheme(theme: UserTheme) {
  localStorage.setItem(KEY, JSON.stringify(theme));
  applyTheme(theme);
}

// ---- Account sync: colors follow the person to every device ----

export async function saveThemeToAccount(theme: UserTheme) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ ui_theme: theme as never }).eq("user_id", user.id);
}

export function startThemeSync() {
  const pull = async (uid: string | undefined) => {
    if (!uid) return;
    const { data } = await supabase.from("profiles").select("ui_theme").eq("user_id", uid).maybeSingle();
    const t = (data as { ui_theme?: UserTheme } | null)?.ui_theme;
    if (t && typeof t === "object") {
      localStorage.setItem(KEY, JSON.stringify(t));
      applyTheme(loadTheme());
      window.dispatchEvent(new Event("dtt-theme"));
    }
  };
  supabase.auth.onAuthStateChange((evt, session) => {
    if (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") void pull(session?.user?.id);
    if (evt === "SIGNED_OUT") { localStorage.removeItem(KEY); applyTheme({}); }
  });
}
