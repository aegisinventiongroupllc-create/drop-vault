import { describe, it, expect } from "vitest";
import { sortRequestsByOffer, requestsBelowMinimum } from "@/lib/requestCountries";

describe("creator request offers", () => {
  it("lists the highest offer first down to 1 Bit-Token", () => {
    const sorted = sortRequestsByOffer([{ amount_usd: 20 }, { amount_usd: 200 }, { amount_usd: 60 }]);
    expect(sorted.map((r) => r.amount_usd)).toEqual([200, 60, 20]);
  });
  it("only pending offers under the minimum are declined", () => {
    const rows = [
      { id: "a", amount_usd: 20, status: "pending" },
      { id: "b", amount_usd: 100, status: "pending" },
      { id: "c", amount_usd: 20, status: "paid" },
      { id: "d", amount_usd: 99, status: "pending" },
    ];
    expect(requestsBelowMinimum(rows, 100).map((r) => r.id)).toEqual(["a", "d"]);
  });
});
