import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ watermark: vi.fn(), upload: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) }),
  storage: { from: () => ({ upload: mocks.upload }) },
} }));
vi.mock("@/lib/mediaWatermark", () => ({ watermarkCreatorMedia: mocks.watermark }));
import CreatorProfilePhotoGallery from "@/components/CreatorProfilePhotoGallery";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("creator onboarding gallery gates", () => {
  it("does not process or upload public portraits before approval, and opens private preparation", async () => {
    const prepare = vi.fn();
    const { container } = render(<CreatorProfilePhotoGallery creatorId="test-creator" uploadAllowed={false} onPrepareDrafts={prepare} />);
    fireEvent.click(screen.getByRole("button", { name: "PREPARE PRIVATE PHOTOS & VIDEOS" }));
    expect(prepare).toHaveBeenCalledOnce();
    const input = container.querySelector("input[type=file]");
    if (!input) throw new Error("Missing gallery input");
    fireEvent.change(input, { target: { files: [new File(["test"], "test.jpg", { type: "image/jpeg" })] } });
    await act(async () => {});
    expect(mocks.watermark).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("offers the existing public gallery upload only for an eligible creator", async () => {
    render(<CreatorProfilePhotoGallery creatorId="test-creator" uploadAllowed />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "ADD PHOTO OR 5-SECOND SMILE" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "PREPARE PRIVATE PHOTOS & VIDEOS" })).toBeNull();
  });
});