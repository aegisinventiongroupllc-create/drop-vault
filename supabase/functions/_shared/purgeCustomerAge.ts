import { encryptAgeDecision, customerEvidencePaths } from "./customerAgePrivacy.ts";
// A service client is required; never accept a browser-selected bucket or path.
export async function purgeCustomerAge(service: any, reviewId: string, secret: string) {
  const { data: row, error } = await service.from("dtt_identity_reviews").select("id,user_id,audience,document_bucket,id_front_path,id_back_path,selfie_path,face_video_path,status,reviewed_at,document_expires_on").eq("id", reviewId).eq("audience", "customer").in("status", ["approved", "rejected"]).maybeSingle();
  if (error) throw new Error("Customer cleanup unavailable");
  if (!row) return;
  const encrypted = await encryptAgeDecision({ verified_at: row.reviewed_at, status: row.status, expires_on: row.document_expires_on }, row.user_id, secret);
  const removed = await service.storage.from("dtt-identity-review").remove(customerEvidencePaths(row));
  if (removed.error) throw new Error("Customer evidence deletion pending");
  const finalized = await service.rpc("finalize_customer_age_review", { _id: row.id, _encrypted: encrypted });
  if (finalized.error) throw new Error("Customer cleanup finalization pending");
}