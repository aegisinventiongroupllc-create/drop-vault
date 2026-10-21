export interface BrowsePosition { top: number; rows: Record<string, number> }
export function browseKey(userId: string, scope: string): string {
  return `dtt_teaser_browse:${userId}:${scope}`;
}
export function readBrowsePosition(userId: string | null, scope: string): BrowsePosition {
  if (!userId) return { top: 0, rows: {} };
  try {
    const value = JSON.parse(localStorage.getItem(browseKey(userId, scope)) || "null");
    const rows: Record<string, number> = {};
    if (value?.rows && typeof value.rows === "object") Object.entries(value.rows).slice(0, 100).forEach(([key, left]) => {
      if (typeof left === "number" && Number.isFinite(left) && left >= 0) rows[key] = left;
    });
    return { top: typeof value?.top === "number" && Number.isFinite(value.top) ? Math.max(0, value.top) : 0, rows };
  } catch { return { top: 0, rows: {} }; }
}
export function saveBrowsePosition(userId: string | null, scope: string, position: BrowsePosition): void {
  if (!userId) return;
  try { localStorage.setItem(browseKey(userId, scope), JSON.stringify({ top: position.top, rows: position.rows })); } catch { /* Storage unavailable. */ }
}
export function teaserTapAction(previous: number | null, now: number): "play" | "library" {
  return previous !== null && now - previous >= 0 && now - previous <= 350 ? "library" : "play";
}