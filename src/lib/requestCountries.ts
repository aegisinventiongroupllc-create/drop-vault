export function groupRequestsByCountry<T extends { origin_country?: string | null }>(requests: T[]) {
  const groups = new Map<string, T[]>();
  for (const request of requests) {
    const country = request.origin_country?.trim() || "UNKNOWN";
    groups.set(country, [...(groups.get(country) || []), request]);
  }
  return [...groups].map(([country, items]) => ({ country, items, count: items.length }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
}