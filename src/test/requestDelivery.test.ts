import { describe, expect, it } from "vitest";
import { canStageRequest, requestAccessActive, requestVideoLinkSeconds, REQUEST_ACCESS_DAYS } from "@/lib/requestDelivery";
describe("custom request delivery", () => {
  const start = Date.UTC(2026, 9, 17);
  const expires = new Date(start + REQUEST_ACCESS_DAYS * 86400000).toISOString();
  it("grants exactly 14 days", () => expect(new Date(expires).getTime() - start).toBe(14 * 24 * 60 * 60 * 1000));
  it("allows staging after agreement", () => expect(canStageRequest("accepted", null)).toBe(true));
  it("does not stage pending offers", () => expect(canStageRequest("pending", null)).toBe(false));
  it("does not expose a draft before payment", () => expect(requestAccessActive(null, start)).toBe(false));
  it("locks at the 14-day boundary", () => expect(requestAccessActive(expires, start + 14 * 86400000)).toBe(false));
  it("limits video link lifetime to remaining access", () => expect(requestVideoLinkSeconds(expires, new Date(expires).getTime() - 20000)).toBe(20));
});