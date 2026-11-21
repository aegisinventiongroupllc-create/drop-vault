import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreatorShareActions from "@/components/CreatorShareActions";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("creator share actions", () => {
  it("falls back to copying the exact creator link without native sharing", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CreatorShareActions creatorName="@dtt_creator" />);
    fireEvent.click(screen.getByRole("button", { name: "SHARE LIBRARY" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://dropthatthing.com/creator/dtt_creator"));
  });
  it("passes the creator link to the native sharing service", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    render(<CreatorShareActions creatorName="dtt_creator" />);
    fireEvent.click(screen.getByRole("button", { name: "SHARE LIBRARY" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "DTT · @dtt_creator", text: "Find @dtt_creator on DTT · 18+ only", url: "https://dropthatthing.com/creator/dtt_creator" }));
  });
  it("offers recovery on share failure and does not copy after cancellation", async () => {
    const writeText = vi.fn();
    const share = vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError"));
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });
    render(<CreatorShareActions creatorName="dtt_creator" />);
    fireEvent.click(screen.getByRole("button", { name: "SHARE LIBRARY" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(writeText).not.toHaveBeenCalled();
    share.mockRejectedValueOnce(new Error("Unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "SHARE LIBRARY" }));
    await screen.findByRole("status");
    expect(writeText).not.toHaveBeenCalled();
  });
});