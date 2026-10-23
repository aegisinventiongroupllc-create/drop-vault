import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_KEY, previewNeedsSignIn, verifyAdminPasscode } from "@/lib/adminSession";

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });
describe("admin access failure handling", () => {
  it("requires account sign-in for private media previews even after passcode access", () => {
    expect(previewNeedsSignIn(true, true, true, null)).toBe(true);
    expect(previewNeedsSignIn(true, true, true, "signed-in-account")).toBe(false);
    expect(previewNeedsSignIn(true, true, false, null)).toBe(false);
    expect(previewNeedsSignIn(false, true, true, null)).toBe(false);
  });
  it("handles a rejected code without throwing or granting access", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Invalid access code" }), { status: 401 })));
    expect(await verifyAdminPasscode("000000")).toBe(false);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it("handles a network failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await verifyAdminPasscode("000000")).toBe(false);
  });
  it("requires an explicit server approval", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: "true" }))));
    expect(await verifyAdminPasscode("000000")).toBe(false);
  });
});