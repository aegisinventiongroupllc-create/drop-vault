import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreatorAgreementModal from "@/components/CreatorAgreementModal";

afterEach(cleanup);
describe("creator agreement persistence", () => {
  it("does not submit before the creator agrees", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<CreatorAgreementModal onAgree={save} />);
    fireEvent.click(screen.getByRole("button", { name: "AGREE & CONTINUE" }));
    expect(save).not.toHaveBeenCalled();
  });
  it("keeps the agreement open when saving fails and permits retry", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("denied")).mockResolvedValueOnce(undefined);
    render(<CreatorAgreementModal onAgree={save} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "AGREE & CONTINUE" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "AGREE & CONTINUE" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  });
});