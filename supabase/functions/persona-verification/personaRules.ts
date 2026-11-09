export const PERSONA_TEMPLATE_ID = "itmpl_AumByMZxSSuxYs2VB1NxDAPVHSNib7";
const states = ["created", "pending", "completed", "approved", "declined", "failed", "expired", "needs_review"];
export function inquirySummary(body: unknown, userId: string, expectedId?: string) {
  const resource = (body as { data?: { id?: unknown; attributes?: Record<string, unknown> } } | null)?.data;
  if (!resource || typeof resource.id !== "string" || !/^inq_[A-Za-z0-9]+$/.test(resource.id) || (expectedId && resource.id !== expectedId)) throw new Error("Invalid inquiry response");
  if (resource.attributes?.["reference-id"] !== userId) throw new Error("Inquiry ownership mismatch");
  const status = resource.attributes?.status;
  if (typeof status !== "string" || !states.includes(status)) throw new Error("Unknown inquiry status");
  return { inquiryId: resource.id, status, environment: "sandbox" as const, grantsCreatorApproval: false as const };
}
export function safeOneTimeLink(body: unknown) {
  const link = (body as { meta?: Record<string, unknown> } | null)?.meta?.["one-time-link"];
  if (typeof link !== "string") throw new Error("Persona did not provide a verification link");
  const url = new URL(link);
  if (url.protocol !== "https:" || url.hostname !== "inquiry.withpersona.com" || url.pathname !== "/verify" || url.username || url.password) throw new Error("Invalid verification link");
  return url.toString();
}