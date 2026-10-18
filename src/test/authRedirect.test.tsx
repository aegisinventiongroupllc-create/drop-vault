import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AuthScreen from "@/components/AuthScreen";

const mocks = vi.hoisted(() => ({ oauth: vi.fn().mockResolvedValue({ redirected: true }) }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/activityLog", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/adminSession", () => ({ verifyAdminPasscode: vi.fn() }));
vi.mock("@/components/LegalFooter", () => ({ default: () => null }));

afterEach(cleanup);
describe("DTT Google callback", () => {
  it("returns customers to the public DTT domain, never the preview", async () => {
    render(<AuthScreen onAdmin={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "CONTINUE WITH GOOGLE" }));
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledWith("google", {
      redirect_uri: "https://dropthatthing.com",
      extraParams: { prompt: "select_account" },
    }));
  });
});