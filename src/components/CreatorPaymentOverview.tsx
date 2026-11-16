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
          <dt className="text-sm font-semibold text-foreground">Manual Litecoin payouts</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Available creator earnings are paid manually in Litecoin (LTC) to the creator’s saved Litecoin address. Bank transfers and payouts to debit or credit cards are not offered. No fixed wallet-arrival date is promised.</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">Debit and credit cards — pending</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Customer debit-card and credit-card checkout is pending provider approval and payment verification. These methods are not currently offered as approved live payments; availability is shown at checkout.</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-foreground">TryBit — testing status</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">TryBit checkout may be available for testing. That does not establish written provider approval for live payments. A genuine purchase-to-payout journey remains unverified. Access and credits require verified payment; a test invoice alone grants neither.</dd>
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