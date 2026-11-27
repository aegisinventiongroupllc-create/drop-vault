export const CUSTOMER_EVIDENCE_DEADLINE_HOURS = 24;
export type AgeDecision = { verified_at: string; status: "approved" | "rejected"; expires_on: string };
async function key(secret: string) {
  if (secret.length < 64) throw new Error("Audit encryption unavailable");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
function base64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function unbase64(value: string) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
export async function encryptAgeDecision(decision: AgeDecision, userId: string, secret: string) {
  const minimal: AgeDecision = { verified_at: decision.verified_at, status: decision.status, expires_on: decision.expires_on };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) }, await key(secret), new TextEncoder().encode(JSON.stringify(minimal)));
  return JSON.stringify({ v: 1, iv: base64(iv), data: base64(new Uint8Array(ciphertext)) });
}
export async function decryptAgeDecision(value: string, userId: string, secret: string): Promise<AgeDecision> {
  const envelope = JSON.parse(value);
  if (envelope.v !== 1) throw new Error("Invalid encrypted decision");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(envelope.iv), additionalData: new TextEncoder().encode(userId) }, await key(secret), unbase64(envelope.data));
  const decision = JSON.parse(new TextDecoder().decode(plaintext));
  if (!["approved", "rejected"].includes(decision.status) || !/^\d{4}-\d{2}-\d{2}$/.test(decision.expires_on) || !Number.isFinite(Date.parse(decision.verified_at))) throw new Error("Invalid decision");
  return { verified_at: decision.verified_at, status: decision.status, expires_on: decision.expires_on };
}
export function customerEvidencePaths(row: { audience: string; user_id: string; document_bucket: string; id_front_path: string; id_back_path: string; selfie_path: string; face_video_path: string }) {
  const paths = [row.id_front_path, row.id_back_path, row.selfie_path, row.face_video_path];
  if (row.audience !== "customer" || row.document_bucket !== "dtt-identity-review" || paths.some(path => !path.startsWith(`${row.user_id}/`) || path.includes("..")) || new Set(paths).size !== 4) throw new Error("Customer-only evidence required");
  return paths;
}