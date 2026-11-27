export const FEED_CATEGORIES = [
  { id: "women", label: "WOMEN" }, { id: "men", label: "MEN" },
  { id: "trans_women", label: "TRANS WOMEN" }, { id: "trans_men", label: "TRANS MEN" },
  { id: "adaptive", label: "HANDICAP" },
] as const;
export type FeedCategory = typeof FEED_CATEGORIES[number]["id"];
export type FeedTab = "trending" | "following" | "latest";
/** Country passed to the feed: "WW" means Worldwide within the active category only. */
export function feedCountry(filter: string | null | undefined): string {
  const v = (filter ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : "WW";
}
/** Captions render as plain text: hashtags are never linked or collected. */
export function plainCaption(text: string): string {
  return text.replace(/[\u0000-\u001f]/g, " ").trim();
}
export function postLink(origin: string, postId: string): string {
  return `${origin}/?post=${encodeURIComponent(postId)}`;
}
export function flagOf(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)) : "🌐";
}
