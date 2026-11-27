export const FACE_REVIEW_STEPS = [
  { label: "Face the camera", seconds: 2 },
  { label: "Turn your head left", seconds: 3 },
  { label: "Turn your head right", seconds: 3 },
  { label: "Look up", seconds: 2 },
  { label: "Look down", seconds: 2 },
] as const;
export const FACE_REVIEW_SECONDS = FACE_REVIEW_STEPS.reduce((sum, step) => sum + step.seconds, 0);
export function faceReviewAt(elapsed: number) {
  let start = 0;
  for (const step of FACE_REVIEW_STEPS) {
    if (elapsed < start + step.seconds) return { label: step.label, remaining: Math.ceil(start + step.seconds - elapsed) };
    start += step.seconds;
  }
  return null;
}
export function validFaceReview(file?: File) {
  return Boolean(file && ["video/webm", "video/mp4"].includes(file.type) && file.size > 0 && file.size <= 10485760);
}