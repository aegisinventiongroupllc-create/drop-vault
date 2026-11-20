/** Presentation intent only; account roles and approval remain server-verified. */
export function isCreatorSignup(search: string): boolean {
  return new URLSearchParams(search).get("signup") === "creator";
}
export const CREATOR_SIGNUP_URL = "/?signup=creator&nointro=1";
export const FOUNDING_INVITATION_URL = "https://dropthatthing.com/founding-creators";
export const FOUNDING_OFFER = { placesPerCategory: 5, creatorPercent: 91, platformPercent: 9, tokenValueUsd: 20 } as const;