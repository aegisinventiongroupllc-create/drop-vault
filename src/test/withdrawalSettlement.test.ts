import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { vaultCreditBitCents, creatorClawbackUsd, settleCreator } from "@/lib/withdrawalSettlement";

const sql = readFileSync("drizzle/migrations/0094_withdrawal_token_settlement.sql", "utf8");

describe("creator withdrawal settlement", () => {
  it("credits (N/14)*100 Bit-cents for unused vault days", () => {
    expect(vaultCreditBitCents(7)).toBe(50);
    expect(vaultCreditBitCents(14)).toBe(100);
    expect(vaultCreditBitCents(1)).toBe(7);
  });
  it("claws back unearned creator share of $18 per 14 days", () => {
    expect(creatorClawbackUsd(7)).toBe(9);
    expect(creatorClawbackUsd(1)).toBe(1.29);
  });
  it("DTT covers what the creator's pending balance can't", () => {
    expect(settleCreator(10, 10.29)).toEqual({ deducted: 10, dttCovers: 0.29, finalNet: 0 });
    expect(settleCreator(50, 9)).toEqual({ deducted: 9, dttCovers: 0, finalNet: 41 });
  });
  it("credits buyouts from the last 14 days only, as Bit-cents, never cash", () => {
    expect(sql).toContain("purchased_at > now() - interval '14 days'");
    expect(sql).toMatch(/bit_cents = public\.token_balances\.bit_cents \+ 100/);
    expect(sql).not.toMatch(/refund/i);
  });
});
