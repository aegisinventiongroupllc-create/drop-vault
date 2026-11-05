import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useIntroEntryReady } from "@/hooks/useIntroEntryReady";

afterEach(() => vi.useRealTimers());

it("allows entry exactly three seconds after the intro opens", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useIntroEntryReady(true));
  act(() => vi.advanceTimersByTime(2999));
  expect(result.current).toBe(false);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe(true);
});