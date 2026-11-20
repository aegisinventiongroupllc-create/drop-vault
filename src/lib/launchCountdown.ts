/** Times Square midnight: January 1, 2027, 00:00 America/New_York. */
export const LAUNCH_AT = Date.parse("2027-01-01T00:00:00-05:00");

export function launchCountdown(now = Date.now()) {
  const total = Math.max(0, Math.ceil((LAUNCH_AT - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60, complete: total === 0 };
}