export const ADMIN_SESSION_KEY = "dtt_secret_admin_ok";
export const ADMIN_PASSCODE_KEY = "dtt_admin_passcode";
export const ADMIN_OVERRIDE_KEY = "dtt_admin_override";

/** A normal account login ends dashboard previews, not staff authorization. */
export function clearAdminDashboardPreview(): void {
  try {
    localStorage.removeItem("dtt_admin_view_as_creator");
    localStorage.removeItem("dtt_admin_view_as_customer");
  } catch { /* Storage may be unavailable. */ }
}

/** Keep dashboard choices exclusive without changing account authorization. */
export function startAdminDashboardPreview(role: "creator" | "customer"): void {
  clearAdminDashboardPreview();
  try { localStorage.setItem(`dtt_admin_view_as_${role}`, "1"); } catch { /* Storage may be unavailable. */ }
}

/** A navigation shortcut, never an administrator credential. */
export function isAdminSignInShortcut(mode: string, value: string): boolean {
  return mode === "login" && ["143", "052417"].includes(value.trim());
}

/** Shortcuts reuse verified staff sessions; they never authorize a visitor. */
export async function adminLoginDestination(mode: string, value: string): Promise<string | null> {
  if (!isAdminSignInShortcut(mode, value) && !isAdminAccessCode(mode, value)) return null;
  if (await ensureAdminAccountSession()) return "/admin-portal";
  return "/admin-access";
}

/** Numeric access codes are candidates only; the server decides validity. */
export function isAdminAccessCode(mode: string, value: string): boolean {
  return mode === "login" && /^\d{6,12}$/.test(value.trim());
}

/** Passcode previews must not mount private media before account sign-in. */
export function previewNeedsSignIn(preview: boolean, verified: boolean, authReady: boolean, userId: string | null): boolean {
  return preview && verified && authReady && !userId;
}

/** Drop saved admin credentials after the server rejects them, so every screen stops retrying a dead code. */
export function clearStoredAdminCredentials(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
    localStorage.removeItem(ADMIN_OVERRIDE_KEY);
  } catch { /* Storage may be unavailable. */ }
}

/** The access code is never stored in the app bundle — it is verified server-side. */
export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const code = passcode.trim();
  if (!code) return false;
  // Remember whether this attempt replayed the saved code; a server rejection then
  // clears the saved code instead of letting every admin screen retry it and 401.
  const replayingStoredCode = code === getAdminPasscode();
  const attempt = async (): Promise<boolean> => {
    try {
      // A rejected code is an expected sign-in outcome, not an uncaught function error.
      // Keep the server's 401 response and access checks intact.
      // The passcode is only a second factor for an already signed-in admin account.
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ passcode: code }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return false;
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true) return false;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return false;
      const { data: admin, error: roleError } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (roleError || admin !== true) return false;
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        sessionStorage.setItem(ADMIN_PASSCODE_KEY, code);
        localStorage.setItem(ADMIN_OVERRIDE_KEY, "1");
      } catch {}
      return true;
    } catch {
      return false;
    }
  };
  const ok = await attempt();
  if (!ok && replayingStoredCode) clearStoredAdminCredentials();
  return ok;
}

/** Upgrade an older valid-code tab to a real administrator session before mounting private views. */
export async function ensureAdminAccountSession(): Promise<boolean> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const { data, error: roleError } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!roleError && data === true) return true;
    }
  }
  return verifyAdminPasscode(getAdminPasscode());
}

export function getAdminPasscode(): string {
  try {
    return sessionStorage.getItem(ADMIN_PASSCODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function isAdminUnlocked(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1" && !!getAdminPasscode();
  } catch {
    return false;
  }
}

/** Headers for admin-only server calls: the signed-in account session is what the server checks. */
export async function adminRequestHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}
