import { describe, expect, it } from "vitest";
import { FACE_REVIEW_STEPS, FACE_REVIEW_SECONDS, faceReviewAt } from "@/lib/faceReview";
describe("private human face-review timing", () => {
  it("holds left for three seconds", () => expect(FACE_REVIEW_STEPS.find(s => s.label === "Turn your head left")?.seconds).toBe(3));
  it("holds right for three seconds", () => expect(FACE_REVIEW_STEPS.find(s => s.label === "Turn your head right")?.seconds).toBe(3));
  it("holds up for two seconds", () => expect(FACE_REVIEW_STEPS.find(s => s.label === "Look up")?.seconds).toBe(2));
  it("holds down for two seconds", () => expect(FACE_REVIEW_STEPS.find(s => s.label === "Look down")?.seconds).toBe(2));
  it("finishes only after all twelve seconds including the initial face view", () => { expect(FACE_REVIEW_SECONDS).toBe(12); expect(faceReviewAt(11)?.label).toBe("Look down"); expect(faceReviewAt(12)).toBeNull(); });
});