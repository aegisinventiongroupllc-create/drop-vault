import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BeRightBack from "@/components/BeRightBack";
import { saveTheme, usePersonalGlobe } from "@/lib/userTheme";

vi.mock("@/components/MiniGlobe", () => ({ default: () => null }));
vi.mock("@/components/GalaxyReel", () => ({ default: () => {
  const { brbStyle, brbTone } = usePersonalGlobe();
  return <output data-testid="idle-selection">{brbStyle}:{brbTone}</output>;
} }));

afterEach(() => { cleanup(); saveTheme({}); vi.useRealTimers(); });

describe("Be Right Back", () => {
  it("opens after exactly one minute and requires two clicks to return", () => {
    vi.useFakeTimers();
    saveTheme({ starStyle: "blueMeteor", galaxy: "#14b8a6" });
    render(<BeRightBack />);
    act(() => { vi.advanceTimersByTime(59_999); });
    expect(screen.queryByRole("status", { name: "Be right back" })).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId("idle-selection").textContent).toBe("blueMeteor:#14b8a6");
    fireEvent.touchStart(window);
    fireEvent.click(window);
    expect(screen.getByRole("status", { name: "Be right back" })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(150); });
    fireEvent.click(window);
    expect(screen.queryByRole("status", { name: "Be right back" })).toBeNull();
  });
  it("does not dismiss on scrolling, typing or clicks more than 700ms apart", () => {
    vi.useFakeTimers();
    render(<BeRightBack />);
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.scroll(window); fireEvent.keyDown(window, { key: "a" });
    fireEvent.click(window);
    act(() => { vi.advanceTimersByTime(701); });
    fireEvent.click(window);
    expect(screen.getByRole("status", { name: "Be right back" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("status", { name: "Be right back" })).toBeNull();
  });
  it("restarts the minute on real activity", () => {
    vi.useFakeTimers();
    render(<BeRightBack />);
    act(() => { vi.advanceTimersByTime(30_000); });
    fireEvent.keyDown(window, { key: "a" });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.queryByRole("status", { name: "Be right back" })).toBeNull();
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByRole("status", { name: "Be right back" })).toBeInTheDocument();
  });
});