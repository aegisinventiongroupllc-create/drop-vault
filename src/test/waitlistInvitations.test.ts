// @vitest-environment node
import { describe, expect, it } from "vitest";
import { waitlistInvitationsOpen } from "../../supabase/functions/_shared/waitlistInvitations";

describe("customer payment invitations", () => {
  it("cannot invite anyone to pay before New York New Year launch", () => {
    expect(waitlistInvitationsOpen(true, true, Date.parse("2027-01-01T04:59:59Z"))).toBe(false);
  });
  it("cannot invite anyone when neither provider is verified ready", () => {
    expect(waitlistInvitationsOpen(false, false, Date.parse("2027-01-01T05:00:00Z"))).toBe(false);
  });
  it("allows invitations after launch with a ready crypto or card provider", () => {
    expect(waitlistInvitationsOpen(true, false, Date.parse("2027-01-01T05:00:00Z"))).toBe(true);
    expect(waitlistInvitationsOpen(false, true, Date.parse("2027-01-01T05:00:00Z"))).toBe(true);
  });
});