// Presentation only: paid entitlements and recorded earnings remain server-managed.
export const CREATOR_EARNINGS = {
  base: 90,
  founding: 91,
  pro: 92,
  elite: 93,
  powerWeek: 92,
  annualAward: 95,
  request: 85,
  eliteRequest: 90,
  powerWeekDays: 7,
  paidFollowerMilestone: 100_000,
} as const;

const split = (creator: number) => `${creator}/${100 - creator}`;
export const CREATOR_EARNINGS_SUMMARY =
  `Vault earnings use the $20 Bit-Token spending value, not the checkout price: standard ${split(CREATOR_EARNINGS.base)}; qualifying founding creators ${split(CREATOR_EARNINGS.founding)} for life; payment-verified Pro ${split(CREATOR_EARNINGS.pro)} and Elite ${split(CREATOR_EARNINGS.elite)} for life. ` +
  `Without a VIP pass, each ${CREATOR_EARNINGS.paidFollowerMilestone.toLocaleString("en-US")} unique paid library followers starts a ${CREATOR_EARNINGS.powerWeekDays}-day ${split(CREATOR_EARNINGS.powerWeek)} Power Week, then the applicable lifetime baseline resumes. Renewals, likes, hearts, tips and entry passes do not qualify. ` +
  `The annual country award grants ${split(CREATOR_EARNINGS.annualAward)} for life to one year-end paid-follower winner per country after administrator confirmation, taking precedence over other vault rates. ` +
  `Custom requests use the agreed request price: ${split(CREATOR_EARNINGS.request)} for standard, founding, Pro and annual-award creators; only payment-verified Elite grants ${split(CREATOR_EARNINGS.eliteRequest)}. Customer-paid fees are separate and vault awards do not change request rates. Tips transfer 100% of the $20-per-token spending value with no separate tipping fee.`;