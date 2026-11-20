import { describe, expect, it } from "vitest";
import { customerWaitlistTicket } from "@/lib/customerWaitlistTicket";

const row = { user_id: "12345678-1234-1234-1234-123456789abc", joined_at: "2026-11-20T18:00:00Z", country: "US" };
describe("saved customer ticket", () => {
  it("gives prelaunch members the $10 annual lifetime offer", () => {
    expect(customerWaitlistTicket(row)?.annualUsd).toBe(10);
  });
  it("keeps the account-linked ticket stable across reloads and country changes", () => {
    expect(customerWaitlistTicket(row)?.number).toBe("DTT-12345678-1234-1234-1234-123456789ABC");
    expect(customerWaitlistTicket({ ...row, country: "CA" })?.number).toBe(customerWaitlistTicket(row)?.number);
  });
  it("does not issue the prelaunch offer to a launch-time record", () => {
    expect(customerWaitlistTicket({ ...row, joined_at: "2027-01-01T05:00:00Z" })).toBeNull();
  });
  it("does not invent tickets for missing or invalid saved records", () => {
    expect(customerWaitlistTicket(null)).toBeNull();
    expect(customerWaitlistTicket({ ...row, user_id: "" })).toBeNull();
    expect(customerWaitlistTicket({ ...row, joined_at: "invalid" })).toBeNull();
  });
});