/** Replacing a signed URL or leaving a tile interrupts play; that is not a corrupt file. */
export function isPlaybackInterruption(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export function hasLibraryContent(count: number | null): boolean {
  return count !== null && Number.isFinite(count) && count > 0;
}