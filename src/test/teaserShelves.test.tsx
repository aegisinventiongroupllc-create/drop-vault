import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShelfTeaser } from "@/components/TeaserShelves";

vi.mock("@/components/ProfileAvatar", () => ({ default: () => null }));
describe("teaser tile gestures", () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("never starts on mount, starts on one tap and navigates on the second tap", () => {
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    const onPlay = vi.fn();
    const onCreatorClick = vi.fn();
    const item = { id: "real-teaser", creator: "LoveBug", creatorAvatar: {}, title: "Teaser", description: "", likes: 0, comments: 0, color: "", vault: "women" as const, country: "US", videoUrl: "https://example.invalid/private.mp4" };
    const { rerender } = render(<ShelfTeaser item={item} active={false} onPlay={onPlay} onCreatorClick={onCreatorClick} unlocked={false} />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play Teaser by @LoveBug" }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onCreatorClick).not.toHaveBeenCalled();
    rerender(<ShelfTeaser item={item} active onPlay={onPlay} onCreatorClick={onCreatorClick} unlocked={false} />);
    expect(play).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Play Teaser by @LoveBug" }));
    expect(onCreatorClick).toHaveBeenCalledWith("LoveBug");
  });
});