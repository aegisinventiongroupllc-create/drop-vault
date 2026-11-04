import { identityAge } from "@/lib/identityVerification";

export const DTT_VERIFICATION_STEPS = ["Document details", "Government ID", "Holding photo", "Review & submit"] as const;
export interface VerificationDetails {
  name: string;
  dob: string;
  expires: string;
  issuingCountry: string;
  documentNumber: string;
}
export function canContinueVerification(step: number, details: VerificationDetails, evidence: { front?: unknown; back?: unknown; selfie?: unknown }, today = new Date()): boolean {
  const age = identityAge(details.dob, today);
  const expiration = new Date(`${details.expires}T00:00:00Z`);
  const detailsValid = details.name.trim().length >= 2 && details.name.trim().length <= 160
    && age !== null && age >= 18
    && /^\d{4}-\d{2}-\d{2}$/.test(details.expires) && Number.isFinite(expiration.getTime())
    && expiration.toISOString().slice(0, 10) === details.expires
    && /^[A-Z]{2}$/.test(details.issuingCountry)
    && details.documentNumber.trim().length > 0 && details.documentNumber.trim().length <= 100;
  if (!detailsValid) return false;
  if (step === 0) return true;
  if (!evidence.front || !evidence.back) return false;
  if (step === 1) return true;
  return (step === 2 || step === 3) && Boolean(evidence.selfie);
}