export const CREATOR_SIGNUP_RECIPIENT = "admin@dttmediallc.com";
export interface CreatorSignupAccount {
  user_id: string;
  email: string;
  account_type: string | null;
  created_at: string;
}

/** Server-read account data only; no browser-provided recipient, role or identity. */
export async function notifyCreatorSignup(
  account: CreatorSignupAccount,
  send: (template: string, recipient: string, options: { templateData: Record<string, string>; idempotencyKey: string }) => Promise<{ sent: boolean }>,
) {
  // Do not mislabel long-standing creators as new signups after rollout.
  if (account.account_type !== "creator" || Date.parse(account.created_at) < Date.parse("2026-11-21T23:10:00Z")) return { sent: false, skipped: true };
  return send("creator-signup-started", CREATOR_SIGNUP_RECIPIENT, {
    templateData: { email: account.email, startedAt: account.created_at },
    idempotencyKey: `creator-signup-started-${account.user_id}`,
  });
}