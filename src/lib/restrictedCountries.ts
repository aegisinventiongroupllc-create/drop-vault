// Single source of truth for geo-blocking.
// ISO 3166-1 alpha-2 codes. Mirrored in src/components/RestrictedCountries.tsx (display).

export const BLOCKED_COUNTRY_CODES: ReadonlySet<string> = new Set([
  // OFAC / UN / EU comprehensive sanctions
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia (sanctioned scope — full block to be safe)
  "BY", // Belarus
  "VE", // Venezuela
  "MM", // Myanmar
  // Adult-content prohibited jurisdictions
  "AF", "BD", "BT", "BN", "CN", "EG", "IN", "ID", "IQ", "JO",
  "KW", "LB", "LY", "MY", "MV", "MA", "NP", "OM", "PK", "QA",
  "SA", "SG", "SO", "LK", "SD", "TN", "TR", "TM", "AE", "UZ",
  "VN", "YE",
]);

export const isBlockedCountry = (code?: string | null): boolean => {
  if (!code) return false;
  return BLOCKED_COUNTRY_CODES.has(code.toUpperCase());
};
