import { LAUNCH_AT } from "./launchCountdown";

export type CustomerWaitlistTicket = { number: string; joinedAt: string; annualUsd: 10; country: string };

/** A receipt of saved membership, not a payment credential or access token. */
export function customerWaitlistTicket(record: unknown): CustomerWaitlistTicket | null {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const row = record as Record<string, unknown>;
  if (typeof row.user_id !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.user_id)) return null;
  if (typeof row.joined_at !== "string" || !Number.isFinite(Date.parse(row.joined_at)) || Date.parse(row.joined_at) >= LAUNCH_AT) return null;
  if (typeof row.country !== "string") return null;
  return { number: `DTT-${row.user_id.toUpperCase()}`, joinedAt: row.joined_at, country: row.country, annualUsd: 10 };
}

export function ticketDownloadText(ticket: CustomerWaitlistTicket): string {
  return ["DTT™ — FOUNDING CUSTOMER TICKET", ticket.number, `Joined: ${ticket.joinedAt}`, `Country: ${ticket.country}`,
    "Your saved offer: $10 a year for life on this account, including annual renewals.",
    "Each paid annual entry pass lasts 365 days. Standard annual entry: $20.",
    "For DTT’s global twerking feed when customer viewing opens. Paid creator libraries require separate Bit-Tokens.",
    "Waiting-list membership is free. This ticket is not an invoice, payment, or access pass and is not transferable.",
    "Payments remain closed until launch and approved payment readiness. No payment is due today.",
    "https://dropthatthing.com", "Support: dropthatthingmedia@gmail.com"].join("\n");
}