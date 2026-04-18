import { useState } from "react";

type LegalView = null | "tos" | "privacy" | "2257" | "contact" | "refund" | "aml" | "risk" | "complaints";

const LegalFooter = () => {
  const [view, setView] = useState<LegalView>(null);
  const close = () => setView(null);

  const links: { id: Exclude<LegalView, null>; label: string }[] = [
    { id: "tos", label: "Terms of Service" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "refund", label: "Refund Policy" },
    { id: "aml", label: "AML / KYC" },
    { id: "risk", label: "Risk Disclosure" },
    { id: "complaints", label: "Complaints" },
    { id: "2257", label: "18 U.S.C. § 2257" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <>
      <footer className="py-5 px-4 text-center border-t border-border mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-2">
          {links.map((l, i) => (
            <span key={l.id} className="flex items-center gap-3">
              <button
                onClick={() => setView(l.id)}
                className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
              >
                {l.label}
              </button>
              {i < links.length - 1 && <span className="text-muted-foreground/30 text-[10px]">·</span>}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          © {new Date().getFullYear()} DTT Media LLC. All Rights Reserved. Must be 18+ to enter.
        </p>
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed mt-1">
          Card payments processed by <span className="font-semibold text-foreground">Banxa</span> (licensed third-party processor). Crypto settlement via NOWPayments.
        </p>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed mt-1">
          DTT Media LLC · Registered in the United States · Support: <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a>
        </p>
      </footer>

      {view && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 overflow-y-auto overscroll-contain p-6" style={{ WebkitOverflowScrolling: "touch" }}>
              {view === "2257" && <Statement2257 />}
              {view === "tos" && <TermsOfService />}
              {view === "privacy" && <PrivacyPolicy />}
              {view === "contact" && <ContactInfo />}
              {view === "refund" && <RefundPolicy />}
              {view === "aml" && <AmlPolicy />}
              {view === "risk" && <RiskDisclosure />}
              {view === "complaints" && <Complaints />}
            </div>
            <div className="border-t border-border p-3 bg-card">
              <button
                onClick={close}
                className="w-full py-2.5 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors tracking-widest"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const SectionShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">{title}</h3>
    <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">{children}</div>
  </>
);

const Statement2257 = () => (
  <SectionShell title="18 U.S.C. § 2257 Record Keeping Compliance Statement">
    <p>All models, actors, and other persons appearing in visual depictions of actual or simulated sexually explicit conduct on this website were at least 18 years of age at the time the visual depictions were created.</p>
    <p><strong className="text-foreground">DTT Media LLC</strong> is the technology platform and operator. All content is uploaded by independent contractors (Creators), who are the primary "Producers" and required by 18 U.S.C. § 2257 to maintain original records of age and identity verification.</p>
    <p>DTT Media LLC maintains secondary records of identity and age for all Creators through our automated verification systems (Persona).</p>
    <p className="text-muted-foreground/60 text-[10px]">Compliance inquiries: office@dttmediallc.com</p>
  </SectionShell>
);

const TermsOfService = () => (
  <SectionShell title="Terms of Service">
    <p><strong className="text-foreground">1. The Platform.</strong> DropThatThing (operated by DTT Media LLC) is a technology platform facilitating social interaction and marketplace transactions between Customers and Independent Creators.</p>
    <p><strong className="text-foreground">2. Age Requirement.</strong> You must be at least 18 years of age (or the legal age of majority in your jurisdiction). Access by minors is strictly prohibited and will result in account termination and reporting to authorities.</p>
    <p><strong className="text-foreground">3. Independent Contractors.</strong> Creators are independent contractors and not employees, partners, or agents of DTT Media LLC. Creators are solely responsible for their content, taxes, and legal compliance in their jurisdiction.</p>
    <p><strong className="text-foreground">4. Prohibited Use.</strong> You may not use the platform for: illegal content, content involving minors, non-consensual material, fraud, money laundering, terrorism financing, sanctions evasion, or any activity violating applicable law. Violations result in immediate account termination, fund seizure, and reporting to law enforcement.</p>
    <p><strong className="text-foreground">5. Geographic Restrictions.</strong> The platform is not available to residents of jurisdictions where adult content or crypto-related services are prohibited, including but not limited to: OFAC-sanctioned countries (Iran, North Korea, Syria, Cuba, Crimea), and any region listed in our Ghost Country list. It is your responsibility to ensure local legality.</p>
    <p><strong className="text-foreground">6. Payments & Fees.</strong> Bit-Tokens are digital access credits (1 token = $20 USD value, 14-day access). A $1 platform fee applies per transaction. Card payments are processed by <strong className="text-foreground">Banxa Pty Ltd</strong>, a licensed Money Service Business; crypto payments via NOWPayments. All settlement is in LTC. Exchange rates and processor fees are disclosed at checkout.</p>
    <p><strong className="text-foreground">7. No Refunds.</strong> All sales are final (see Refund Policy).</p>
    <p><strong className="text-foreground">8. Account Security.</strong> You are responsible for safeguarding your credentials. Notify us immediately of unauthorized access.</p>
    <p><strong className="text-foreground">9. Liability.</strong> The platform is provided "as is." DTT Media LLC's total liability is limited to fees paid in the 30 days preceding a claim.</p>
    <p><strong className="text-foreground">10. Governing Law.</strong> These terms are governed by the laws of the State of Delaware, USA. Disputes are resolved by binding arbitration.</p>
    <p><strong className="text-foreground">11. Changes.</strong> We may amend these terms; continued use constitutes acceptance.</p>
  </SectionShell>
);

const PrivacyPolicy = () => (
  <SectionShell title="Privacy Policy">
    <p><strong className="text-foreground">1. Data Collected.</strong> Email, account info, transaction history, IP address, device data, and (for Creators) government-issued ID and liveness selfies via Persona.</p>
    <p><strong className="text-foreground">2. Purpose.</strong> Age & identity verification, fraud prevention, payment settlement, AML/KYC compliance, legal audit response.</p>
    <p><strong className="text-foreground">3. Legal Basis (GDPR/UK).</strong> Contract performance, legal obligation (AML/CTF), and legitimate interests in fraud prevention.</p>
    <p><strong className="text-foreground">4. Third-Party Processors.</strong> Banxa (card on-ramp), NOWPayments (crypto settlement), Persona (identity verification), Supabase (database/auth/storage). All processors are bound by data processing agreements.</p>
    <p><strong className="text-foreground">5. Retention.</strong> KYC records: 5 years post-account-closure (regulatory requirement). Transaction logs: 7 years. Marketing data: until you opt out.</p>
    <p><strong className="text-foreground">6. Your Rights.</strong> Access, correction, deletion (subject to legal retention), portability, objection. Email office@dttmediallc.com to exercise rights.</p>
    <p><strong className="text-foreground">7. Cookies.</strong> Essential cookies only; no third-party advertising trackers.</p>
    <p><strong className="text-foreground">8. Data Sales.</strong> We do not sell user data.</p>
    <p><strong className="text-foreground">9. International Transfers.</strong> Data may be processed in the US and EU under Standard Contractual Clauses.</p>
    <p><strong className="text-foreground">10. Breach Notification.</strong> Affected users notified within 72 hours of confirmed breach.</p>
  </SectionShell>
);

const RefundPolicy = () => (
  <SectionShell title="Refund & Cancellation Policy">
    <p><strong className="text-foreground">All sales are final.</strong> Bit-Tokens are digital access credits delivered immediately upon payment confirmation and are non-refundable once credited.</p>
    <p><strong className="text-foreground">Exceptions.</strong> A refund will be issued only if: (a) tokens were charged but not credited within 24 hours due to a technical error on our side; (b) duplicate charge confirmed by the payment processor; (c) refund is required by applicable consumer protection law in your jurisdiction.</p>
    <p><strong className="text-foreground">Card Disputes.</strong> Card-payment refunds are issued by <strong className="text-foreground">Banxa</strong> back to the original payment method, typically within 5–10 business days. Crypto payments are non-reversible by nature; refunds (if approved) are returned in LTC to the originating wallet.</p>
    <p><strong className="text-foreground">How to Request.</strong> Email <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a> with order ID, transaction hash (if crypto), and reason. Response within 5 business days.</p>
    <p><strong className="text-foreground">Chargebacks.</strong> Fraudulent or abusive chargebacks result in permanent account termination and may be reported to credit bureaus and law enforcement.</p>
  </SectionShell>
);

const AmlPolicy = () => (
  <SectionShell title="AML / KYC Policy">
    <p>DTT Media LLC and its payment partners (Banxa, NOWPayments) maintain a strict Anti-Money Laundering (AML) and Counter-Terrorism Financing (CTF) program in line with FinCEN, FATF, and EU 5AMLD/6AMLD guidance.</p>
    <p><strong className="text-foreground">Customer Due Diligence (CDD).</strong> Card purchases above processor thresholds require ID verification through Banxa. Creators must complete full KYC (government ID + liveness selfie) via Persona before payouts.</p>
    <p><strong className="text-foreground">Sanctions Screening.</strong> All users are screened against OFAC, UN, EU, and UK sanctions lists. Hits result in account freeze and report filing.</p>
    <p><strong className="text-foreground">Transaction Monitoring.</strong> Automated systems flag structuring, velocity anomalies, and high-risk geographies. Suspicious Activity Reports (SARs) are filed where required by law.</p>
    <p><strong className="text-foreground">Prohibited Sources.</strong> Funds derived from criminal activity, mixers/tumblers, darknet markets, or sanctioned entities are refused; accounts are terminated and authorities notified.</p>
    <p><strong className="text-foreground">Record Keeping.</strong> KYC and transaction records retained for 5 years (or longer where required).</p>
    <p>Compliance contact: <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a></p>
  </SectionShell>
);

const RiskDisclosure = () => (
  <SectionShell title="Risk Disclosure">
    <p><strong className="text-foreground">Crypto Volatility.</strong> Cryptocurrencies (LTC, BTC, ETH) are highly volatile. The fiat value of crypto sent or received may change before, during, or after the transaction.</p>
    <p><strong className="text-foreground">Irreversibility.</strong> Crypto transactions are irreversible once broadcast. Always verify the address before sending. DTT Media LLC and its processors cannot recover funds sent to incorrect addresses.</p>
    <p><strong className="text-foreground">Network Fees.</strong> Blockchain network fees fluctuate and are paid by the buyer.</p>
    <p><strong className="text-foreground">No Investment.</strong> Bit-Tokens are utility access credits, not investments, securities, or stored-value instruments. They have no resale value, no interest, and expire 14 days after activation.</p>
    <p><strong className="text-foreground">Regulatory Risk.</strong> Crypto and adult-content regulations vary by jurisdiction and may change. You are responsible for compliance with your local laws.</p>
    <p><strong className="text-foreground">No Guarantees.</strong> Service availability, creator activity, and content are not guaranteed.</p>
  </SectionShell>
);

const Complaints = () => (
  <SectionShell title="Complaints Procedure">
    <p>We aim to resolve all complaints fairly and promptly.</p>
    <p><strong className="text-foreground">Step 1 — Contact Us.</strong> Email <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a> with subject line "COMPLAINT" and include your account email, order/transaction ID, and a description of the issue.</p>
    <p><strong className="text-foreground">Step 2 — Acknowledgement.</strong> We acknowledge complaints within 2 business days and aim to resolve within 15 business days. Complex cases may take up to 35 business days; we will keep you informed.</p>
    <p><strong className="text-foreground">Step 3 — Payment Processor Disputes.</strong> Card payment complaints not resolved by us may be escalated to <strong className="text-foreground">Banxa</strong> support at <a href="mailto:support@banxa.com" className="text-primary hover:underline">support@banxa.com</a>.</p>
    <p><strong className="text-foreground">Step 4 — Regulatory Escalation.</strong> Unresolved complaints may be escalated to the financial ombudsman or consumer protection authority in your jurisdiction.</p>
  </SectionShell>
);

const ContactInfo = () => (
  <SectionShell title="Contact Us">
    <p><strong className="text-foreground">DTT Media LLC</strong></p>
    <p>Operator of DropThatThing. For all inquiries — support, compliance, partnerships, refunds, complaints, and legal — please contact our team at the email below.</p>
    <p><strong className="text-foreground">Support email:</strong> <a href="mailto:office@dttmediallc.com" className="text-primary hover:underline">office@dttmediallc.com</a></p>
    <p><strong className="text-foreground">Response time:</strong> within 2 business days.</p>
    <p className="text-muted-foreground/60 text-[10px]">Card payment processor: Banxa Pty Ltd — support@banxa.com</p>
  </SectionShell>
);

export default LegalFooter;
