export interface PaymentReadinessInput {
  credentialsPresent: boolean;
  webhookSecret: string;
  approval: string | undefined;
  checkoutVerified: string | undefined;
}

/** Credentials alone never authorize live checkout. Missing evidence fails closed. */
export function liveCheckoutEnabled(input: PaymentReadinessInput): boolean {
  return input.credentialsPresent
    && input.webhookSecret.trim().length >= 24
    && input.approval === "true"
    && input.checkoutVerified === "true";
}