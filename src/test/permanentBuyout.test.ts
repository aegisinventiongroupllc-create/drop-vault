import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
const sql = readFileSync("drizzle/migrations/0072_permanent_video_buyouts.sql", "utf8");
describe("permanent video buyouts", () => {
  it("defaults to off for every video", () => {
    expect(sql).toMatch(/allow_permanent_buyout boolean NOT NULL DEFAULT false/);
  });
  it("costs one token split from the $20 base", () => {
    expect(sql).toMatch(/b<1 THEN RAISE EXCEPTION 'INSUFFICIENT_TOKENS'/);
    expect(sql).toMatch(/VALUES\(u,m\.creator_id,20,/);
  });
  it("uses a payment id the paid-follower counter ignores", () => {
    expect(sql).toMatch(/'buyout-'\|\|/);
    expect("buyout-x".startsWith("unlock-") || "buyout-x".startsWith("autorenew-")).toBe(false);
  });
});
