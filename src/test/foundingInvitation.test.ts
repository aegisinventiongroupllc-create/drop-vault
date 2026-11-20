import { describe, expect, it } from "vitest";
import { CREATOR_SIGNUP_URL, CUSTOMER_WAITLIST_URL, FOUNDING_OFFER, isCreatorSignup, isCustomerSignup } from "@/lib/foundingInvitation";

describe("founding invitation presentation", () => {
  it("opens customer signup separately without bypassing consent or claiming payment", () => {
    const url = new URL(CUSTOMER_WAITLIST_URL, "https://dropthatthing.com");
    expect(url.pathname).toBe("/");
    expect(isCustomerSignup(url.search)).toBe(true);
    expect(isCreatorSignup(url.search)).toBe(false);
    expect(url.searchParams.has("verified")).toBe(false);
    expect(url.searchParams.has("paid")).toBe(false);
  });
  it("retains five places per category and the lifetime 91/9 offer", () => {
    expect(FOUNDING_OFFER.placesPerCategory).toBe(5);
    expect(FOUNDING_OFFER.creatorPercent).toBe(91);
    expect(FOUNDING_OFFER.platformPercent).toBe(9);
    expect(FOUNDING_OFFER.tokenValueUsd * FOUNDING_OFFER.creatorPercent / 100).toBe(18.2);
  });
  it("opens creator signup without skipping mandatory consent", () => {
    const url = new URL(CREATOR_SIGNUP_URL, "https://dropthatthing.com");
    expect(url.pathname).toBe("/");
    expect(isCreatorSignup(url.search)).toBe(true);
    expect(url.searchParams.has("verified")).toBe(false);
  });
  it("keeps ordinary signup unchanged and rejects unrelated intents", () => {
    expect(isCreatorSignup("")).toBe(false);
    expect(isCreatorSignup("?signup=customer")).toBe(false);
    expect(isCreatorSignup("?signup=admin")).toBe(false);
  });
});