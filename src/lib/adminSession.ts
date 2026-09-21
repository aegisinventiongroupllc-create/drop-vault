import { supabase } from "@/integrations/supabase/client";

export const ADMIN_SESSION_KEY = "dtt_secret_admin_ok";
export const ADMIN_PASSCODE_KEY = "dtt_admin_passcode";
export const ADMIN_OVERRIDE_KEY = "dtt_admin_override";

/** The access code is never stored in the app bundle — it is verified server-side. */
export async function verifyAdminPasscode(passcode: string): Promise<boolean> {
  const code = passcode.trim();
  if (!code) return false;
  try {
    const { data, error } = await supabase.functions.invoke("admin-auth", {
      body: { passcode: code },
    });
    if (error || !(data as any)?.ok) return false;
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
