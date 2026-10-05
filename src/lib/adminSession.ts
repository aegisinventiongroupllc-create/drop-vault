export const ADMIN_SESSION_KEY = "dtt_secret_admin_ok";
export const ADMIN_PASSCODE_KEY = "dtt_admin_passcode";
export const ADMIN_OVERRIDE_KEY = "dtt_admin_override";

/** The access code is never stored in the app bundle — it is verified server-side. */
export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const code = passcode.trim();
  if (!code) return false;
  try {
    // A rejected code is an expected sign-in outcome, not an uncaught function error.
    // Keep the server's 401 response and access checks intact.
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ passcode: code }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return false;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("ok" in data) || data.ok !== true) return false;
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      sessionStorage.setItem(ADMIN_PASSCODE_KEY, code);
      localStorage.setItem(ADMIN_OVERRIDE_KEY, "1");
    } catch {}
    return true;
  } catch {
    return false;
  }
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
