import { describe, expect, it } from "vitest";
import {
  calculateCustomRequestSplit,
  CUSTOM_REQUEST_ADMIN_FEE_USD,
  CUSTOM_REQUEST_PROCESSING_FEE_USD,
  CUSTOM_REQUEST_CREATOR_PERCENT,
  CUSTOM_REQUEST_PLATFORM_PERCENT,
} from "@/lib/tokenEconomy";

// Custom requests: base splits 85% creator / 15% platform.
// The customer pays a $1 DTT fee and a $4 card-processing cover on top of the
// base, and those fees never reduce the creator's share.
describe("Custom request economy", () => {
  it("splits the base 85/15", () => {
    expect(CUSTOM_REQUEST_CREATOR_PERCENT).toBe(85);
    expect(CUSTOM_REQUEST_PLATFORM_PERCENT).toBe(15);
  });

  it("pays the creator $850 on a $1,000 request", () => {
    const split = calculateCustomRequestSplit(1000);
    expect(split.creatorShare).toBe(850);
    expect(split.platformShare).toBe(150);
  });

  it("charges the customer base + $1 fee + $4 processing cover", () => {
    const split = calculateCustomRequestSplit(500);
    expect(split.adminFee).toBe(1);
    expect(split.processingFee).toBe(4);
    expect(split.invoiceTotal).toBe(505);
  });

  it("keeps fees out of the creator share", () => {
    const split = calculateCustomRequestSplit(2500);
    expect(split.creatorShare).toBe(2125);
    expect(split.totalPlatformRevenue).toBe(
      CUSTOM_REQUEST_ADMIN_FEE_USD + CUSTOM_REQUEST_PROCESSING_FEE_USD + split.platformShare
    );
    expect(split.invoiceTotal).toBe(split.creatorShare + split.totalPlatformRevenue);
  });
});
