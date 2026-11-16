export const REFUND_SUMMARY = "Digital purchases are final once the purchased credits or benefits are delivered after verified payment. DTT does not offer discretionary cash or card refunds; exceptions required by applicable law or payment-provider rules remain available. Creator-departure credits follow the Refund Policy.";

export const DISPUTE_SUMMARY = "A legitimate payment dispute is not, by itself, fraud. Suspected abuse may be investigated; confirmed fraud or abuse may result in permanent account termination. Your rights under applicable law and payment-provider rules remain unchanged.";

export const CHARGEBACK_EARNINGS = "Earnings from confirmed chargebacks or confirmed fraudulent payments may be reversed. Disputed payments and related access may be restricted during review; a legitimate dispute is not, by itself, fraud.";

export function RefundDisputeNotice() {
  return (
    <div className="space-y-2 text-left text-xs leading-relaxed text-muted-foreground">
      <p>{REFUND_SUMMARY}</p>
      <p>{DISPUTE_SUMMARY}</p>
      <p>For duplicate charges, missing credits or benefits, unauthorized payments, or undelivered agreed requests, contact <a href="mailto:admin@dttmediallc.com" className="break-all text-primary underline">admin@dttmediallc.com</a> with your order ID. Contacting DTT is not a condition of exercising your payment-dispute rights. See the Refund Policy for full terms.</p>
    </div>
  );
}