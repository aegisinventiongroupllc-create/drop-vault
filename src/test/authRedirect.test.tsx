import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthScreen, { googleReturnOrigin } from "@/components/AuthScreen";

const mocks = vi.hoisted(() => ({ oauth: vi.fn().mockResolvedValue({ redirected: true }) }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/activityLog", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/adminSession", () => ({ verifyAdminPasscode: vi.fn() }));
vi.mock("@/components/LegalFooter", () => ({ default: () => null }));
vi.mock("@/components/MiniGlobe", () => ({ default: () => null }));

afterEach(cleanup);
describe("DTT Google callback", () => {
  it("live DTT hosts return to the public DTT domain", () => {
    expect(googleReturnOrigin("https://dropthatthing.com")).toBe("https://dropthatthing.com");
    expect(googleReturnOrigin("https://www.dropthatthing.com")).toBe("https://dropthatthing.com");
    expect(googleReturnOrigin("https://neon-vaults.lovable.app")).toBe("https://dropthatthing.com");
  });

  it("other windows receive the session themselves", () => {
    const preview = "https://id-preview--d0f857cb-581b-446a-a13e-8f3ad489575b.lovable.app";
    expect(googleReturnOrigin(preview)).toBe(preview);
  });

  it("sends the current window's return address to Google sign-in", async () => {
    render(<AuthScreen onAdmin={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE WITH GOOGLE" }));
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledWith("google", {
      redirect_uri: googleReturnOrigin(window.location.origin),
      extraParams: { prompt: "select_account" },
    }));
  });
});
