export function draftStatusAllowed(status: string, banned = false, underage = false): boolean {
  return !banned && !underage && ["unsubmitted", "pending", "flagged", "approved"].includes(status);
}

export function validIdentityExpiry(expiry: string, today = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return false;
  const parsed = new Date(`${expiry}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === expiry && expiry >= today.toISOString().slice(0,10);
}