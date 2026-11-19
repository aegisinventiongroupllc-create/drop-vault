export const SECURITY_ALERT_RECIPIENT = "Admin@dttmediallc.com";
export type DenialType = "admin_code_rejected" | "identity_access_denied";
export type DenialSource = "admin-auth" | "admin-verifications";
export type RecordedDenial = { id: string; created_at: string };

/** One logical email per denial type per UTC 15-minute window, across workers. */
export function securityAlertOptions(eventType: DenialType, event: RecordedDenial) {
  const bucket = Math.floor(Date.parse(event.created_at) / (15 * 60 * 1000));
  if (!event.id || !Number.isFinite(bucket)) throw new Error("Invalid recorded event");
  return {
    templateData: { eventType, occurredAt: event.created_at, eventId: event.id },
    idempotencyKey: `security-denial-${eventType}-${bucket}`,
  };
}

export async function recordAndNotifyDenial(
  eventType: DenialType,
  source: DenialSource,
  actorId: string | null,
  dependencies: {
    record: (type: DenialType, source: DenialSource, actor: string | null) => Promise<RecordedDenial>;
    send: (template: string, recipient: string, options: ReturnType<typeof securityAlertOptions>) => Promise<{ sent: boolean }>;
    report: (message: string) => void;
  },
): Promise<void> {
  let event: RecordedDenial;
  try {
    event = await dependencies.record(eventType, source, actorId);
  } catch {
    dependencies.report("Security denial recording unavailable");
    return;
  }
  try {
    const result = await dependencies.send("security-access-denied", SECURITY_ALERT_RECIPIENT, securityAlertOptions(eventType, event));
    if (!result.sent) dependencies.report("Security alert recipient suppressed");
  } catch {
    // Notification failure never changes the blocked outcome or deletes the record.
    dependencies.report("Security alert email unavailable");
  }
}