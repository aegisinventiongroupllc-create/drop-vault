import { describe, expect, it } from "vitest";
import { summarizeCreatorEarnings, earnedTokenCount, type CreatorEarning } from "@/lib/creatorWelcomeBack";
const row: CreatorEarning = { id: "1", created_at: "2026-10-05", amount_usd: 20, creator_share_usd: 18, platform_share_usd: 2, payment_id: "unlock-1", purchase_id: "purchase-1" };
describe("creator welcome-back earnings", () => {
  it("shows actual net revenue and actual spent tokens", () => {
    expect(summarizeCreatorEarnings(Array.from({ length: 10 }, () => row))).toEqual({ usd: 180, tokens: 10 });
  });
  it("includes dollar revenue without pretending it is token revenue", () => {
    const tip = { ...row, amount_usd: 100, creator_share_usd: 99, purchase_id: null, payment_id: "tip-1" };
    expect(summarizeCreatorEarnings([row, tip])).toEqual({ usd: 117, tokens: 1 });
  });
  it("counts legacy unlocks and renewals without a purchase link", () => {
    expect(earnedTokenCount({ ...row, purchase_id: null, payment_id: "autorenew-123" })).toBe(1);
  });
  it("has a truthful empty first-visit summary", () => {
    expect(summarizeCreatorEarnings([])).toEqual({ usd: 0, tokens: 0 });
  });
});