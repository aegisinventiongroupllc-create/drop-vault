// @vitest-environment node
import { describe, expect, it } from "vitest";
import { liveCheckoutEnabled } from "../../supabase/functions/_shared/paymentReadiness";

const ready = { credentialsPresent: true, webhookSecret: "a".repeat(32), approval: "true", checkoutVerified: "true" };
describe("live payment authorization", () => {
  it("keeps credentials-only checkout unavailable", () => {
    expect(liveCheckoutEnabled({ ...ready, approval: undefined, checkoutVerified: undefined })).toBe(false);
  });
  it("requires explicit provider approval", () => {
    expect(liveCheckoutEnabled({ ...ready, approval: "false" })).toBe(false);
    expect(liveCheckoutEnabled({ ...ready, approval: "TRUE" })).toBe(false);
  });
  it("requires a verified checkout before offering live payment", () => {
    expect(liveCheckoutEnabled({ ...ready, checkoutVerified: undefined })).toBe(false);
  });
  it("requires credentials and a private confirmation secret", () => {
    expect(liveCheckoutEnabled({ ...ready, credentialsPresent: false })).toBe(false);
    expect(liveCheckoutEnabled({ ...ready, webhookSecret: "" })).toBe(false);
  });
  it("allows checkout only with all readiness evidence", () => {
    expect(liveCheckoutEnabled(ready)).toBe(true);
  });
});