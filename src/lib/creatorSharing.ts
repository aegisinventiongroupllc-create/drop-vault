const SAVED_CREATOR_KEY = "dtt_saved_creator_link";

export function creatorHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_][A-Za-z0-9_.]{2,23}$/.test(handle) ? handle : null;
}

/** Match literal handles case-insensitively, never SQL LIKE wildcards. */
export function creatorNamePattern(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

export function creatorShareUrl(value: unknown): string | null {
  const handle = creatorHandle(value);
  return handle ? `https://dropthatthing.com/creator/${encodeURIComponent(handle)}` : null;
}

export function rememberCreator(value: unknown): string | null {
  const handle = creatorHandle(value);
  if (handle) try { localStorage.setItem(SAVED_CREATOR_KEY, handle); } catch { /* optional device storage */ }
  return handle;
}

export function savedCreator(): string | null {
  try { return creatorHandle(localStorage.getItem(SAVED_CREATOR_KEY)); } catch { return null; }
}

export function saveCreatorLink(handle: string) {
  const url = creatorShareUrl(handle);
  if (!url) return;
  const blob = new Blob([`DTT · @${handle}\n${url}\nCreator link only. Not payment or library access.\n`], { type: "text/plain;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `dtt-creator-${handle}.txt`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}