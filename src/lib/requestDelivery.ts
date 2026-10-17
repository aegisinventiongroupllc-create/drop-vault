export const REQUEST_ACCESS_DAYS = 14;
export const REQUEST_RENEWAL_TOKENS = 1;
export function requestAccessActive(until: string | null, now = Date.now()): boolean {
  return until !== null && new Date(until).getTime() > now;
}
export function requestVideoLinkSeconds(until: string | null, now = Date.now()): number {
  if (!requestAccessActive(until, now) || until === null) return 0;
  return Math.max(0, Math.min(60, Math.floor((new Date(until).getTime() - now) / 1000)));
}
export function canStageRequest(status: string, path: string | null): boolean {
  return (status === "accepted" || status === "paid") && path === null;
}