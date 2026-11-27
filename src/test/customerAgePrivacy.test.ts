// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CUSTOMER_EVIDENCE_DEADLINE_HOURS, customerEvidencePaths, decryptAgeDecision, encryptAgeDecision } from "../../supabase/functions/_shared/customerAgePrivacy";
describe("Minimal customer age audit", () => {
  const secret = "test-only-key-".repeat(6);
  const decision = { verified_at: "2026-11-27T02:30:00Z", status: "approved" as const, expires_on: "2027-11-27" };
  it("uses the owner's 24-hour outside deletion limit", () => { expect(CUSTOMER_EVIDENCE_DEADLINE_HOURS).toBe(24); });
  it("encrypts only timestamp, pass/fail and expiration, not raw identity fields", async () => {
    const encrypted = await encryptAgeDecision({ ...decision, document_number: "PRIVATE", date_of_birth: "2000-01-01", face_video_path: "private.webm" } as typeof decision, "account-a", secret);
    expect(encrypted).not.toContain("PRIVATE"); expect(encrypted).not.toContain("approved");
    expect(await decryptAgeDecision(encrypted, "account-a", secret)).toEqual(decision);
  });
  it("rejects cross-account decryption and tampering", async () => {
    const encrypted = await encryptAgeDecision(decision, "account-a", secret);
    await expect(decryptAgeDecision(encrypted, "account-b", secret)).rejects.toThrow();
    const envelope = JSON.parse(encrypted); envelope.data = "AAAA";
    await expect(decryptAgeDecision(JSON.stringify(envelope), "account-a", secret)).rejects.toThrow();
  });
  it("uses a fresh encryption nonce on retries", async () => { expect(await encryptAgeDecision(decision,"a",secret)).not.toEqual(await encryptAgeDecision(decision,"a",secret)); });
  it("never deletes creator 2257 records or another account's files", () => {
    const row = { audience: "customer", user_id: "a", document_bucket: "dtt-identity-review", id_front_path: "a/front", id_back_path: "a/back", selfie_path: "a/selfie", face_video_path: "a/face" };
    expect(customerEvidencePaths(row)).toEqual(["a/front", "a/back", "a/selfie", "a/face"]);
    expect(() => customerEvidencePaths({ ...row, audience: "creator", document_bucket: "creator-2257-records" })).toThrow();
    expect(() => customerEvidencePaths({ ...row, face_video_path: "b/face" })).toThrow();
  });
});