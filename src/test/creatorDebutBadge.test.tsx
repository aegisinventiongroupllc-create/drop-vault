import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ value: false, save: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: "creator" } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { first_platform: mocks.value } }) }) }), upsert: mocks.save }) } }));
import CreatorDebutBadge from "@/components/CreatorDebutBadge";
beforeEach(() => { mocks.value = false; mocks.save.mockReset().mockResolvedValue({ error: null }); });
it("defaults off and saves an explicit owner opt-in", async () => {
  render(<CreatorDebutBadge editable />);
  const toggle = await screen.findByRole("switch");
  await waitFor(() => expect(toggle).not.toBeDisabled());
  expect(toggle).toHaveAttribute("aria-checked", "false");
  fireEvent.click(toggle); fireEvent.click(screen.getByRole("button", { name: "SAVE PUBLIC BADGE" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ user_id: "creator", first_platform: true }));
});
it("lets the creator withdraw the declaration", async () => {
  mocks.value = true;
  render(<CreatorDebutBadge editable />);
  const toggle = await screen.findByRole("switch");
  await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
  fireEvent.click(toggle); fireEvent.click(screen.getByRole("button", { name: "SAVE PUBLIC BADGE" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ user_id: "creator", first_platform: false }));
});