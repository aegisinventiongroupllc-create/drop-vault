import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GalaxyReel from "@/components/GalaxyReel";

vi.mock("@/lib/userTheme", () => ({
  usePersonalGlobe: () => ({ reduced: true, starStyle: "cluster" }),
  hexToHsl: () => "",
}));

const requests: FakeImage[] = [];
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
  constructor() { requests.push(this); }
}

beforeEach(() => {
  requests.length = 0;
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    setTransform: vi.fn(), clearRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Sky picture recovery", () => {
  it("retries a failed picture when returning to DTT and stops retrying after success", () => {
    render(<GalaxyReel />);
    expect(requests).toHaveLength(1);
    act(() => requests[0].onerror?.());
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(requests).toHaveLength(2);
    expect(requests[1].src).toBe(requests[0].src);
    act(() => requests[1].onload?.());
    act(() => window.dispatchEvent(new Event("online")));
    expect(requests).toHaveLength(2);
  });

  it("does not duplicate pending loads and removes retry listeners when dismissed", () => {
    const { unmount } = render(<GalaxyReel />);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(requests).toHaveLength(1);
    unmount();
    window.dispatchEvent(new Event("pageshow"));
    expect(requests).toHaveLength(1);
    expect(requests[0].onload).toBeNull();
    expect(requests[0].onerror).toBeNull();
  });
});