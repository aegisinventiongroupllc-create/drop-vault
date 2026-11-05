import { cleanup, fireEvent, render, screen, act, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const auth = vi.hoisted(() => ({ callback: undefined as undefined | ((event: string, session: { user: { id: string } } | null) => void) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  onAuthStateChange: (callback: typeof auth.callback) => {
    auth.callback = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  },
} } }));
const login = () => act(() => auth.callback?.("SIGNED_IN", { user: { id: "member" } }));
const offer = (outcome = "dismissed") => {
  const event = Object.assign(new Event("beforeinstallprompt"), {
    prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome }),
  });
  act(() => window.dispatchEvent(event));
  return event;
};
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("installation confirmation", () => {
  it("clicking Save to Home Screen opens the available native install prompt", async () => {
    render(<PWAInstallPrompt />);
    const event = offer();
    fireEvent.click(screen.getByRole("button", { name: "SAVE TO HOME SCREEN" }));
    await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce());
  });
  it("shows again on the next login after temporary dismissal", () => {
    render(<PWAInstallPrompt />); login();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(localStorage.getItem("dtt_pwa_installed")).toBeNull();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    act(() => auth.callback?.("SIGNED_OUT", null)); login();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });
  it.each(["accepted", "dismissed"])("does not mark a %s browser dialog as installed", async outcome => {
    render(<PWAInstallPrompt />); const event = offer(outcome);
    fireEvent.click(screen.getByRole("button", { name: "INSTALL" }));
    await waitFor(() => expect(event.prompt).toHaveBeenCalledOnce());
    expect(localStorage.getItem("dtt_pwa_installed")).toBeNull();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });
  it("remembers confirmed installation across subsequent visits", () => {
    const first = render(<PWAInstallPrompt />); offer();
    act(() => window.dispatchEvent(new Event("appinstalled")));
    expect(localStorage.getItem("dtt_pwa_installed")).toBe("1");
    first.unmount(); render(<PWAInstallPrompt />); login();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });
  it("recognizes the installed standalone app", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    render(<PWAInstallPrompt />); login();
    expect(localStorage.getItem("dtt_pwa_installed")).toBe("1");
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });
  it("ignores the previous permanent dismissal flag", () => {
    localStorage.setItem("dtt_pwa_dismissed", "1");
    render(<PWAInstallPrompt />); login();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });
});