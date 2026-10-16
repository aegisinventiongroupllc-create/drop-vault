import { expect, it } from "vitest";
import { languageSecondsLeft, LANGUAGE_TRANSITION_MS } from "@/lib/languageTransition";
it("language overlay lasts exactly six seconds across reloads", () => {
  expect(LANGUAGE_TRANSITION_MS).toBe(6000);
  expect(languageSecondsLeft(1000, 1000)).toBe(6);
  expect(languageSecondsLeft(1000, 4000)).toBe(3);
  expect(languageSecondsLeft(1000, 6999)).toBe(1);
  expect(languageSecondsLeft(1000, 7000)).toBe(0);
});