import { describe, expect, it } from "vitest";
import { vipInterestTicket, type VipInterestEntry } from "@/lib/vipInterestTicket";
describe("VIP waiting-list ticket identity", () => {
  const entry: VipInterestEntry = { ticket_id: "123", joined_at: "2026-11-20T20:00:00Z", pass_type: "PRO_PASS", position: 3 };
  it("keeps the saved ticket identity when queue position changes", () => {
    expect(vipInterestTicket(entry)).toBe("DTT-VIP-123");
    expect(vipInterestTicket({ ...entry, position: 1 })).toBe("DTT-VIP-123");
  });
  it("keeps the ticket when switching between Pro and Elite", () => {
    expect(vipInterestTicket({ ...entry, pass_type: "ELITE_PASS" })).toBe("DTT-VIP-123");
  });
});