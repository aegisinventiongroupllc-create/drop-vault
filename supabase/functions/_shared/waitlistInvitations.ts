import { customerCheckoutOpen } from "./customerLaunch.ts";

/** Invitations never override launch or verified provider readiness. */
export function waitlistInvitationsOpen(cryptoReady: boolean, cardReady: boolean, now = Date.now()): boolean {
  return customerCheckoutOpen(now) && (cryptoReady || cardReady);
}