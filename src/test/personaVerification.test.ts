import { describe, it, expect } from "vitest";
import { inquirySummary, safeOneTimeLink } from "../../supabase/functions/persona-verification/personaRules";
const owner = "c6fe5d3a-0000-4000-8000-000000000001";
const inquiry = (status: string, reference = owner) => ({ data: { id: "inq_Example123", attributes: { status, "reference-id": reference, "name-first": "Private", birthdate: "1990-01-01" } } });
describe("Persona sandbox protections", () => {
  it("approved sandbox results never grant creator approval", () => {
    expect(inquirySummary(inquiry("approved"), owner)).toEqual({ inquiryId: "inq_Example123", status: "approved", environment: "sandbox", grantsCreatorApproval: false });
  });
  it("rejects another account's inquiry", () => { expect(() => inquirySummary(inquiry("completed", "another-account"), owner)).toThrow("ownership"); });
  it("rejects substitution of a saved inquiry", () => { expect(() => inquirySummary(inquiry("completed"), owner, "inq_Different")).toThrow("Invalid inquiry"); });
  it("does not project private identity fields", () => { expect(Object.keys(inquirySummary(inquiry("completed"), owner))).toEqual(["inquiryId", "status", "environment", "grantsCreatorApproval"]); });
  it("allows only Persona HTTPS one-time verification links", () => {
    expect(safeOneTimeLink({ meta: { "one-time-link": "https://inquiry.withpersona.com/verify?code=example" } })).toBe("https://inquiry.withpersona.com/verify?code=example");
    for (const link of ["https://evil.example/verify", "http://inquiry.withpersona.com/verify", "https://inquiry.withpersona.com.evil.example/verify"]) expect(() => safeOneTimeLink({ meta: { "one-time-link": link } })).toThrow();
  });
});