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

export type InterestCounts = Record<string, number>;
const interestKey = (userId: string, market: string) => `dtt_teaser_interests:${userId}:${market}`;
export function readInterests(userId: string | null, market: string): InterestCounts {
  if (!userId) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(interestKey(userId, market)) || "{}");
    return Object.fromEntries(Object.entries(raw).filter(([key, count]) => key.length <= 120 && typeof count === "number" && Number.isFinite(count) && count > 0).slice(0, 200)) as InterestCounts;
  } catch { return {}; }
}
export function recordInterest(userId: string | null, market: string, keys: string[]): InterestCounts {
  const counts = readInterests(userId, market);
  if (!userId) return counts;
  keys.filter(Boolean).forEach(key => { counts[key] = Math.min((counts[key] ?? 0) + 1, 1_000_000); });
  const bounded = Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 200));
  try { localStorage.setItem(interestKey(userId, market), JSON.stringify(bounded)); } catch { /* Storage unavailable. */ }
  return bounded;
}
export function rankByInterest<T extends { creatorId?: string; tags?: string[] }>(items: T[], counts: InterestCounts): T[] {
  const score = (item: T) => (counts[`creator:${item.creatorId}`] ?? 0) * 3 + (item.tags ?? []).reduce((sum, tag) => sum + (counts[`tag:${tag}`] ?? 0), 0);
  return items.map((item, index) => ({ item, index, score: score(item) })).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(entry => entry.item);
}