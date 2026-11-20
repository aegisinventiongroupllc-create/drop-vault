/** Gross annual entry sales only; no claim of payment, conversion or net profit. */
export function waitlistEntryForecast(customers: number) {
  const count = Number.isFinite(customers) ? Math.max(0, Math.floor(customers)) : 0;
  return {
    customers: count,
    annualPrice: 10,
    fullParticipationGross: count * 10,
    quarterParticipationGross: Math.floor(count * 0.25) * 10,
  };
}