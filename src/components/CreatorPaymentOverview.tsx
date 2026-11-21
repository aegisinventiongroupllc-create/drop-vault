import { REFUND_SUMMARY, DISPUTE_SUMMARY, CHARGEBACK_EARNINGS } from "@/components/RefundDisputeNotice";

const CreatorPaymentOverview = () => (
  <section aria-labelledby="creator-payment-heading" className="w-full border-b border-border bg-secondary/20">
    <div className="mx-auto max-w-3xl px-6 py-8 sm:py-10">
      <p className="mb-2 text-xs font-bold uppercase text-primary">DTT™ · Creator payments</p>
      <h2 id="creator-payment-heading" className="font-display text-2xl font-bold text-foreground">How creators get paid</h2>
      <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-foreground">Earnings and timing</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">A standard vault unlock earns $18: 90% of the $20 Bit-Token spending value. Vault-access earnings are held for each 14-day access period, then released to the available payout balance. Release is not an instant wallet payment.</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">Crypto or bank payouts · planned</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Creator payouts are planned through a crypto processor, including Litecoin (LTC), or into the creator’s bank account. Options depend on provider approval, country availability and final payout checks. No fixed arrival date is promised.</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">Card payments · preparing for launch</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">We’re getting CCBill card payments ready for launch. Live card checkout is not open yet. You can create your account and complete free private setup now.</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">TryBit payments · preparing for launch</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">We’re preparing TryBit payments and the payout process for launch. Live payments will open after approval and final checks. Free creator setup is open now; paid access and credits activate only after verified payment.</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm font-semibold text-foreground">Disputes and chargebacks</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{REFUND_SUMMARY} {DISPUTE_SUMMARY} {CHARGEBACK_EARNINGS} For payment questions, contact <a href="mailto:admin@dttmediallc.com" className="break-all text-primary underline underline-offset-4">admin@dttmediallc.com</a>. The Refund Policy and Creator &amp; Purchase Rules below provide the full terms.</dd>
        </div>
      </dl>
    </div>
  </section>
);

export default CreatorPaymentOverview;