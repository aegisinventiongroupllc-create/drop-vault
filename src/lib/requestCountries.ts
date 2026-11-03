/** Highest offer first, down to the smallest (1 Bit-Token). */
export function sortRequestsByOffer<T extends { amount_usd?: number | string; created_at?: string }>(requests: T[]) {
  return [...requests].sort((a, b) => Number(b.amount_usd ?? 0) - Number(a.amount_usd ?? 0) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

/** Pending requests whose offer is below the creator's minimum (in USD). */
export function requestsBelowMinimum<T extends { amount_usd: number | string; status: string; expires_at?: string | null }>(requests: T[], minUsd: number, now = Date.now()) {
  return requests.filter((r) => r.status === "pending" && Number(r.amount_usd) < minUsd && !(r.expires_at && new Date(r.expires_at).getTime() < now));
}

export function groupRequestsByCountry<T extends { origin_country?: string | null; amount_usd?: number | string; created_at?: string }>(requests: T[]) {
  const groups = new Map<string, T[]>();
  for (const request of requests) {
    const country = request.origin_country?.trim() || "UNKNOWN";
    groups.set(country, [...(groups.get(country) || []), request]);
  }
  return [...groups].map(([country, items]) => ({ country, items: sortRequestsByOffer(items), count: items.length }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}
