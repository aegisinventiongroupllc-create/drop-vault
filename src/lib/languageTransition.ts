export const LANGUAGE_TRANSITION_MS = 6000;
export const LANGUAGE_TRANSITION_KEY = "dtt_language_transition";

export function beginLanguageTransition() {
  sessionStorage.setItem(LANGUAGE_TRANSITION_KEY, String(Date.now()));
  window.dispatchEvent(new Event("dtt-language-transition"));
}

export function languageSecondsLeft(start: number, now: number) {
  return Math.max(0, Math.ceil((LANGUAGE_TRANSITION_MS - (now - start)) / 1000));
}