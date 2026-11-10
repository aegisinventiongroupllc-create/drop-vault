import { describe, expect, it } from "vitest";
import { publicCreatorUrl, publicParticipantInvitationUrl } from "@/lib/publicBranding";

describe("DTT public links", () => {
  it("shares creator links on the owner's domain", () => {
    expect(publicCreatorUrl("DTT Creator")).toBe("https://dropthatthing.com/?creator=DTT%20Creator");
  });

  it("keeps private invitation tokens in a fragment on the owner's domain", () => {
    const url = new URL(publicParticipantInvitationUrl("test-token"));
    expect(url.origin).toBe("https://dropthatthing.com");
    expect(url.pathname).toBe("/participant-invite");
    expect(url.search).toBe("");
    expect(url.hash).toBe("#test-token");
  });
});