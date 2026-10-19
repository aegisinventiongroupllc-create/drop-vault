import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), galaxySave: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "test-owner" } } }) },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { display_name: "", role: "customer" } }) }) }), update: mocks.update }),
} }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/components/DashboardColorPicker", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  return { default: forwardRef((_, ref) => { useImperativeHandle(ref, () => ({ saveGalaxy: mocks.galaxySave })); return null; }) };
});
vi.mock("@/components/VipBackdrop", () => ({ default: () => null }));
vi.mock("@/components/DttColorWheel", () => ({ default: () => null }));
vi.mock("@/components/SelfieCamera", () => ({ default: () => null }));
vi.mock("@/lib/avatarDraft", () => ({ readPortraitDraft: async () => null, clearPortraitDraft: async () => {}, savePortraitDraft: async () => {} }));
import ProfileIdentityEditor from "@/components/ProfileIdentityEditor";

describe("independent galaxy and identity saving", () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear();
    mocks.galaxySave.mockResolvedValue(true);
    Element.prototype.scrollIntoView = vi.fn();
  });
  it("saves galaxy changes without requiring an untouched empty handle or updating identity", async () => {
    render(<ProfileIdentityEditor />);
    fireEvent.click(await screen.findByRole("button", { name: "SAVE PRIVATE IDENTITY" }));
    await waitFor(() => expect(mocks.galaxySave).toHaveBeenCalledOnce());
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("saves galaxy even when an edited handle is invalid and focuses the handle without writing identity", async () => {
    render(<ProfileIdentityEditor />);
    const input = await screen.findByLabelText("Public avatar name");
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.click(screen.getByRole("button", { name: "SAVE PRIVATE IDENTITY" }));
    await screen.findByRole("alert");
    expect(mocks.galaxySave).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });
});