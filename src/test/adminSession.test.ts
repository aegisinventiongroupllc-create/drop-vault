import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_KEY, adminLoginDestination, isAdminAccessCode, isAdminSignInShortcut, previewNeedsSignIn, verifyAdminPasscode, ensureAdminAccountSession } from "@/lib/adminSession";

const verifyOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
const hasRole = vi.fn().mockResolvedValue({ data: true, error: null });
const getSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } });
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { verifyOtp: (...args: unknown[]) => verifyOtp(...args), getUser: () => getUser(), getSession: () => getSession() }, rpc: (...args: unknown[]) => hasRole(...args) } }));

// The test runner's AbortSignal lacks timeout(); fetch is stubbed so a plain signal is fine.
if (typeof AbortSignal.timeout !== "function") {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = () => new AbortController().signal;
}

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); localStorage.clear(); });
describe("admin access failure handling", () => {
  it("opens the dashboard for the requested shortcut only with verified administrator access", async () => {
    expect(isAdminSignInShortcut("login", "052417")).toBe(true);
    expect(isAdminSignInShortcut("signup", "052417")).toBe(false);
    expect(isAdminSignInShortcut("forgot", "052417")).toBe(false);
    expect(await adminLoginDestination("login", "052417")).toBe("/admin-portal");
    getSession.mockResolvedValueOnce({ data: { session: null } });
    expect(await adminLoginDestination("login", "052417")).toBe("/admin-access");
    hasRole.mockResolvedValueOnce({ data: false, error: null });
    expect(await adminLoginDestination("login", "052417")).toBe("/admin-access");
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
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
  it("clears a saved code the server rejects so screens stop retrying it", async () => {
    sessionStorage.setItem('dtt_admin_passcode', 'old-code');
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Invalid admin passcode" }), { status: 401 })));
    expect(await verifyAdminPasscode("old-code")).toBe(false);
    expect(sessionStorage.getItem('dtt_admin_passcode')).toBeNull();
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it("keeps the saved code when a different manual entry fails", async () => {
    sessionStorage.setItem('dtt_admin_passcode', 'saved-code');
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Invalid admin passcode" }), { status: 401 })));
    expect(await verifyAdminPasscode("wrong-entry")).toBe(false);
    expect(sessionStorage.getItem('dtt_admin_passcode')).toBe('saved-code');
  });
  it("requires an explicit server approval", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: "true" }))));
    expect(await verifyAdminPasscode("000000")).toBe(false);
  });
  it("signs into the administrator account when the server returns a token hash", async () => {
    verifyOtp.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, token_hash: "hash-123" }))));
    expect(await verifyAdminPasscode("0123456")).toBe(true);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash-123", type: "magiclink" });
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe("1");
  });
  it("does not unlock an incomplete passcode-only session", async () => {
    verifyOtp.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
    expect(await verifyAdminPasscode("0123456")).toBe(false);
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it('does not unlock when the one-time account sign-in fails', async () => {
    verifyOtp.mockResolvedValueOnce({ data: {}, error: { message: 'Expired' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, token_hash: 'expired-test-hash' }))));
    expect(await verifyAdminPasscode('0123456')).toBe(false);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it('requires server-verified administrator role after account sign-in', async () => {
    hasRole.mockResolvedValueOnce({ data: false, error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, token_hash: 'test-hash' }))));
    expect(await verifyAdminPasscode('0123456')).toBe(false);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBeNull();
  });
  it('restores an existing administrator without asking for another login', async () => {
    expect(await ensureAdminAccountSession()).toBe(true);
  });
  it('upgrades a code-only tab through real account sign-in', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    sessionStorage.setItem('dtt_admin_passcode', '0123456');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, token_hash: 'test-restore-hash' }))));
    expect(await ensureAdminAccountSession()).toBe(true);
    expect(sessionStorage.getItem(ADMIN_SESSION_KEY)).toBe('1');
  });
});