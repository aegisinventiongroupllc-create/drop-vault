import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PostAuthRolePicker from "@/components/PostAuthRolePicker";

vi.mock("@/components/LegalFooter", () => ({ default: () => null }));
vi.mock("@/components/CreatorLaunchCountdown", () => ({ default: () => null }));
vi.mock("@/i18n/creator", () => ({ useCreatorText: () => ({
  signed_in: "Signed in", signed_in_as: (email: string) => email,
  who_are_you: "Choose account", which_vault: "Category", im_creator: "Creator",
  im_customer: "Customer", founding: "Founding places", back: "Back",
}) }));
afterEach(cleanup);

it("keeps a newly confirmed creator in creator setup instead of customer selection", () => {
  render(<PostAuthRolePicker onSelect={vi.fn()} initialRole="creator" />);
  expect(screen.getByRole("combobox")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Customer" })).toBeNull();
  expect(screen.getByRole("button", { name: "CONTINUE" })).toBeDisabled();
});

it("sends a returning creator straight through with saved category and labels", async () => {
  const select = vi.fn().mockResolvedValue(undefined);
  render(<PostAuthRolePicker onSelect={select} existingCreator={{ category: "women", labels: ["twerking"] }} />);
  fireEvent.click(screen.getByRole("button", { name: "Creator" }));
  await waitFor(() => expect(select).toHaveBeenCalledWith("creator", "women", ["twerking"], []));
});

it("selects customer without requiring creator setup", async () => {
  const select = vi.fn().mockResolvedValue(undefined);
  render(<PostAuthRolePicker onSelect={select} />);
  fireEvent.click(screen.getByRole("button", { name: "Customer" }));
  await waitFor(() => expect(select).toHaveBeenCalledWith("customer", undefined, [], []));
});