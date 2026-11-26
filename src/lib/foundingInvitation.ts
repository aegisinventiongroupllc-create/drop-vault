import { readSignupIntent } from "@/lib/signupIntent";
/** Presentation intent only; account roles and approval remain server-verified. The sign-up screen choice wins over links. */
export function isCreatorSignup(search: string): boolean {
  return readSignupIntent(search) === "creator";
}
export function isCustomerSignup(search: string): boolean {
  return readSignupIntent(search) === "customer";
}
export const CREATOR_SIGNUP_URL = "/?signup=creator&nointro=1";
export const CUSTOMER_WAITLIST_URL = "/?signup=customer&nointro=1";
export const FOUNDING_INVITATION_URL = "https://dropthatthing.com/founding-creators";
export const FOUNDING_OFFER = { placesPerCategory: 5, creatorPercent: 91, platformPercent: 9, tokenValueUsd: 20 } as const;
