import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "login"
  | "signup"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "media_upload"
  | "media_delete"
  | "tokens_purchased"
  | "tokens_spent"
  | "subscription_started"
  | "subscription_renewed"
  | "subscription_expired"
  | "creator_viewed"
  | "search"
  | "custom_request_sent"
  | "custom_request_accepted"
  | "custom_request_declined"
  | "ltc_address_saved"
  | "profile_updated"
  | "id_verification_submitted"
  | "id_verification_approved"
  | "id_verification_rejected"
  | "page_view";

/**
 * Append-only daily activity log. Safe-fire — never throws into the UI.
 * Fails silently if the user is not signed in (RLS blocks it anyway).
 */
export async function logActivity(
  action: ActivityAction,
  detail?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Read the role from protected account data. Never trust browser storage for
    // values that are written into an administrative audit record.
    let role = "customer";
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.role === "creator" || prof?.role === "customer") role = prof.role;
    } catch { /* non-fatal */ }

    await supabase.from("activity_logs").insert([{
      user_id: user.id,
      user_role: role,
      action_type: action,
      action_detail: detail ?? null,
      metadata: (metadata ?? {}) as any,
    }]);
  } catch (err) {
    // Never let logging crash the UI
    if (typeof window !== "undefined" && (window as any).DTT_DEBUG) {
      console.warn("[activityLog] failed:", err);
    }
  }
}