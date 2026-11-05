import { describe, expect, it } from 'vitest';
import { ANNUAL_ACCESS_DAYS, escrowAtDay, spendableTokens } from '@/lib/accessEscrow';
describe('biweekly access funds', () => {
  it('keeps annual access at 26 biweekly periods / 364 days', () => expect(ANNUAL_ACCESS_DAYS).toBe(364));
  it('holds $18 until day 14, accruing precisely $18/14 each day', () => {
    expect(escrowAtDay(1)).toEqual({earned:1.29,payable:0,unearned:16.71});
    expect(escrowAtDay(7)).toEqual({earned:9,payable:0,unearned:9});
    expect(escrowAtDay(14)).toEqual({earned:18,payable:18,unearned:0});
  });
  it('future stacked periods forfeit all $18 while earned periods forfeit nothing', () => {
    expect(escrowAtDay(-14).unearned).toBe(18);
    expect(escrowAtDay(28).unearned).toBe(0);
  });
  it('spends 100 Bit-cents as one token, retaining smaller remainders', () => {
    expect(spendableTokens(0,100)).toBe(1);
    expect(spendableTokens(0,99)).toBe(0);
    expect(spendableTokens(25,150)).toBe(26);
  });
});