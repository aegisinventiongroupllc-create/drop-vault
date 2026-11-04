import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "appearance-owner" } } }) },
  from: () => ({ update: mocks.update }),
} }));
vi.mock("@/components/HexColorWheel", () => ({ default: ({ onChange }: { onChange: (hex: string) => void }) => <input aria-label="Test outline wheel" onChange={e => onChange(e.target.value)} /> }));
vi.mock("@/components/MiniGlobe", () => ({ default: () => null }));
vi.mock("@/components/GalaxyReel", () => ({ default: () => null }));
vi.mock("@/components/SkyGalleryPicker", () => ({ default: () => null }));
vi.mock("@/components/DashboardStarsPicker", () => ({ default: () => null }));
vi.mock("@/components/VipBackdrop", () => ({ useVipGlow: () => false, setVipGlow: () => {} }));
import DashboardColorPicker from "@/components/DashboardColorPicker";
import { loadTheme, saveTheme } from "@/lib/userTheme";

describe("dashboard appearance saving", () => {
  beforeEach(() => { localStorage.clear(); saveTheme({}); vi.clearAllMocks(); });
  it("writes the exact outline wheel choice to the signed-in account", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq });
    render(<DashboardColorPicker />);
    fireEvent.click(screen.getByRole("button", { name: "SHOW COLORS" }));
    fireEvent.click(screen.getByRole("button", { name: "Open color wheel for Box outlines" }));
    fireEvent.change(screen.getAllByLabelText("Test outline wheel")[1], { target: { value: "#14b8a6" } });
    fireEvent.click(screen.getByRole("button", { name: "Save dashboard appearance" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ ui_theme: { outline: "#14b8a6" } }));
    expect(eq).toHaveBeenCalledWith("user_id", "appearance-owner");
    expect(loadTheme().outline).toBe("#14b8a6");
    await waitFor(() => expect(screen.getByRole("button", { name: "SHOW COLORS" }).getAttribute("aria-expanded")).toBe("false"));
  });
  it("keeps saved outline choices on the device when account sync fails", async () => {
    mocks.update.mockReturnValue({ eq: async () => ({ error: { message: "Unavailable" } }) });
    saveTheme({ outline: "#22c55e" });
    render(<DashboardColorPicker />);
    fireEvent.click(screen.getByRole("button", { name: "SHOW COLORS" }));
    fireEvent.click(screen.getByRole("button", { name: "Save dashboard appearance" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "SHOW COLORS" }).getAttribute("aria-expanded")).toBe("false"));
    expect(loadTheme().outline).toBe("#22c55e");
    expect(JSON.parse(localStorage.getItem("dtt_user_theme_pending_appearance-owner") ?? "{}").outline).toBe("#22c55e");
  });
});