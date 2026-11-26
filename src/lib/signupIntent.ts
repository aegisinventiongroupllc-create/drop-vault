/** Presentation intent only: remembers which side a visitor picked on the sign-up screen. Roles stay server-verified. */
export type SignupIntent = "creator" | "customer";
const KEY = "dtt_signup_intent";

/** Store the picked side and rewrite the address so stale ?signup= links cannot override it. */
export function setSignupIntent(role: SignupIntent): void {
  try { sessionStorage.setItem(KEY, role); } catch { /* storage blocked */ }
  const url = new URL(window.location.href);
  if (url.searchParams.has("signup")) {
    url.searchParams.set("signup", role);
    window.history.replaceState(window.history.state, "", url.toString());
  }
}

export function readSignupIntent(search: string): SignupIntent | null {
  const fromUrl = new URLSearchParams(search).get("signup");
  let stored: string | null = null;
  try { stored = sessionStorage.getItem(KEY); } catch { /* ignore */ }
  const value = stored ?? fromUrl;
  return value === "creator" || value === "customer" ? value : null;
}

export function clearSignupIntent(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
