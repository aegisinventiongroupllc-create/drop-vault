import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_KEY, isAdminAccessCode, isAdminSignInShortcut, previewNeedsSignIn, verifyAdminPasscode } from "@/lib/adminSession";

const verifyOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { verifyOtp: (...args: unknown[]) => verifyOtp(...args) } } }));

// The test runner's AbortSignal lacks timeout(); fetch is stubbed so a plain signal is fine.
if (typeof AbortSignal.timeout !== "function") {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = () => new AbortController().signal;
}

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });
describe("admin access failure handling", () => {
  it("accepts seven-digit login codes for server verification without granting access", () => {
    expect(isAdminAccessCode("login", "0123456")).toBe(true);
    expect(isAdminAccessCode("login", " 0123456 ")).toBe(true);
    expect(isAdminAccessCode("signup", "0123456")).toBe(false);
    expect(isAdminAccessCode("forgot", "0123456")).toBe(false);
    expect(isAdminAccessCode("login", "143")).toBe(false);
    expect(isAdminAccessCode("login", "person@example.com")).toBe(false);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it("routes 143 only from login without granting administrator access", () => {
    expect(isAdminSignInShortcut("login", "143")).toBe(true);
    expect(isAdminSignInShortcut("login", " 143 ")).toBe(true);
    expect(isAdminSignInShortcut("signup", "143")).toBe(false);
    expect(isAdminSignInShortcut("forgot", "143")).toBe(false);
    expect(isAdminSignInShortcut("login", "143@example.com")).toBe(false);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
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
  it("signs into the administrator account when the server returns a token hash", async () => {
    verifyOtp.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, token_hash: "hash-123" }))));
    expect(await verifyAdminPasscode("0524171")).toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-123", type: "magiclink" });
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("1");
  });
  it("still unlocks the passcode preview when no token hash is returned", async () => {
    verifyOtp.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
    expect(await verifyAdminPasscode("0524171")).toBe(true);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("1");
  });
});