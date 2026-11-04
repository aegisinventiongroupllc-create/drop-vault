import { describe, expect, it } from "vitest";
import { canContinueVerification } from "@/lib/dttVerificationSteps";

const today = new Date("2026-11-04T13:04:00Z");
const details = { name: "Test Adult", dob: "2008-11-04", expires: "2030-11-04", issuingCountry: "US", documentNumber: "example" };
describe("DTT verification steps", () => {
  it("accepts the exact eighteenth birthday", () => expect(canContinueVerification(0, details, {}, today)).toBe(true));
  it("blocks under-18 details", () => expect(canContinueVerification(0, { ...details, dob: "2008-11-05" }, {}, today)).toBe(false));
  it("requires both government ID sides", () => {
    expect(canContinueVerification(1, details, { front: {} }, today)).toBe(false);
    expect(canContinueVerification(1, details, { front: {}, back: {} }, today)).toBe(true);
  });
  it("requires the holding photo before submission", () => {
    expect(canContinueVerification(3, details, { front: {}, back: {} }, today)).toBe(false);
    expect(canContinueVerification(3, details, { front: {}, back: {}, selfie: {} }, today)).toBe(true);
  });
  it("rejects impossible document dates", () => expect(canContinueVerification(0, { ...details, expires: "2030-02-30" }, {}, today)).toBe(false));
  it("allows expired evidence to be sent to human review without implying approval", () => expect(canContinueVerification(0, { ...details, expires: "2025-11-04" }, {}, today)).toBe(true));
});