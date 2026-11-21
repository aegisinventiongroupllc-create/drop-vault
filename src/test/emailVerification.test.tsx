import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EmailVerification, { EMAIL_VERIFICATION_RETURN } from "@/components/EmailVerification";
import AuthScreen from "@/components/AuthScreen";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), resend: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));
vi.mock("react-helmet-async", () => ({ Helmet: () => null }));
vi.mock("@/components/GalaxyReel", () => ({ default: () => null }));
vi.mock("@/components/EntryPassGlobe", () => ({ default: () => null, ENTRY_GLOBE: {} }));
vi.mock("@/components/MiniGlobe", () => ({ default: () => null }));
vi.mock("@/components/LegalFooter", () => ({ default: () => null }));
vi.mock("@/lib/activityLog", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/adminSession", () => ({ isAdminSignInShortcut: () => false, isAdminAccessCode: () => false, clearAdminDashboardPreview: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/verify-email?confirmed=true");
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mocks.resend.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("DTT email confirmation", () => {
  it("a URL flag or missing account cannot produce confirmed access", async () => {
    render(<EmailVerification />);
    await screen.findByRole("button", { name: "BACK TO LOG IN" });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "CONTINUE TO DTT" })).toBeNull();
  });

  it("only an auth-service-confirmed email offers continuation", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { email_confirmed_at: "2026-11-21T13:58:00Z" } }, error: null });
    render(<EmailVerification />);
    await screen.findByRole("button", { name: "CONTINUE TO DTT" });
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it("resends to the supplied email with the branded return destination and prevents repeat submission", async () => {
    const back = vi.fn();
    render(<EmailVerification email="customer@example.test" onBack={back} />);
    fireEvent.click(screen.getByRole("button", { name: "RESEND CONFIRMATION EMAIL" }));
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledWith({ type: "signup", email: "customer@example.test", options: { emailRedirectTo: EMAIL_VERIFICATION_RETURN } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "EMAIL REQUESTED" })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "EMAIL REQUESTED" }));
    expect(mocks.resend).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "BACK TO LOG IN" }));
    expect(back).toHaveBeenCalledOnce();
  });

  it("failed resend can be retried", async () => {
    mocks.resend.mockResolvedValueOnce({ error: new Error("temporary") });
    render(<EmailVerification email="creator@example.test" />);
    fireEvent.click(screen.getByRole("button", { name: "RESEND CONFIRMATION EMAIL" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "RESEND CONFIRMATION EMAIL" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "RESEND CONFIRMATION EMAIL" }));
    await waitFor(() => expect(mocks.resend).toHaveBeenCalledTimes(2));
  });

  it.each(["CUSTOMER", "CREATOR"])("%s signup waits for confirmation without a session", async role => {
    window.history.replaceState({}, "", "/index?signup=1");
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    render(<AuthScreen onAdmin={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "New here? Create an account" }));
    fireEvent.click(screen.getByRole("button", { name: role }));
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "new@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Synthetic-test-123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    await screen.findByRole("button", { name: "RESEND CONFIRMATION EMAIL" });
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ emailRedirectTo: "https://dropthatthing.com/verify-email?nointro=1", data: expect.objectContaining({ role: role.toLowerCase() }) }) }));
  });

  it("unconfirmed password login offers resend instead of account continuation", async () => {
    window.history.replaceState({}, "", "/index");
    mocks.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
    render(<AuthScreen onAdmin={() => {}} />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "waiting@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Synthetic-test-123" } });
    fireEvent.click(screen.getByRole("button", { name: "LOG IN" }));
    await screen.findByRole("button", { name: "RESEND CONFIRMATION EMAIL" });
    expect(screen.queryByRole("button", { name: "CONTINUE TO DTT" })).toBeNull();
  });
});