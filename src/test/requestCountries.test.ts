import { expect, it } from "vitest";
import { groupRequestsByCountry } from "@/lib/requestCountries";
it("ranks country groups by total incoming requests", () => {
  const requests = [...Array.from({ length: 18 }, () => ({ origin_country: "GB" })), ...Array.from({ length: 42 }, () => ({ origin_country: "US" }))];
  expect(groupRequestsByCountry(requests).map(({ country, count }) => ({ country, count }))).toEqual([{ country: "US", count: 42 }, { country: "GB", count: 18 }]);
});
it("keeps missing country separate rather than inventing an origin", () => { expect(groupRequestsByCountry([{ origin_country: null }])[0].country).toBe("UNKNOWN"); });