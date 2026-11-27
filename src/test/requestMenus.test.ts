import { describe, it, expect } from "vitest";
import { menuError, menuSplit, validMenuPrice, type RequestMenu } from "@/lib/requestMenus";
import { UNLOCK_DURATION_MS, TOKEN_INVOICE_USD } from "@/lib/tokenEconomy";
import { requestVideoLinkSeconds } from "@/lib/requestDelivery";
const menu: RequestMenu = { enabled: true, open_requests: true, open_turnaround_days: 3, items: [{ title: "Custom video", description: "Five minutes", price_usd: 46, turnaround_days: 5 }] };
describe("creator dollar menus", () => {
  it("allows six options but rejects seven", () => {
    expect(menuError({ ...menu, items: Array(6).fill(menu.items[0]) })).toBeNull();
    expect(menuError({ ...menu, items: Array(7).fill(menu.items[0]) })).not.toBeNull();
  });
  it("enforces a $25 minimum and accepts arbitrary cents", () => {
    expect(validMenuPrice(24.99)).toBe(false); expect(validMenuPrice(25)).toBe(true); expect(validMenuPrice(46.37)).toBe(true); expect(validMenuPrice(25.001)).toBe(false);
  });
  it("splits $46 into $39.10 creator and $6.90 platform", () => {
    expect(menuSplit(46).creatorShare).toBe(39.10); expect(menuSplit(46).platformShare).toBe(6.90);
  });
  it("adds the buyer's $1 plus $4 fee without reducing creator payout", () => {
    const s = menuSplit(46); expect(s.adminFee).toBe(1); expect(s.processingFee).toBe(4); expect(s.invoiceTotal).toBe(51); expect(s.creatorShare).toBe(39.10);
  });
  it("requires positive integer turnaround days", () => {
    expect(menuError({ ...menu, open_turnaround_days: 0 })).not.toBeNull(); expect(menuError({ ...menu, open_turnaround_days: 5 })).toBeNull();
  });
  it("keeps the one-token $25 14-day vault unchanged", () => { expect(TOKEN_INVOICE_USD).toBe(25); expect(UNLOCK_DURATION_MS).toBe(14 * 86400000); });
  it("caps delivered request links at 30 seconds", () => { expect(requestVideoLinkSeconds(new Date(100000).toISOString(), 0)).toBe(30); });
});