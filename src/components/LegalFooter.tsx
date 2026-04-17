import { useState } from "react";

type LegalView = null | "tos" | "privacy" | "2257" | "contact";

const LegalFooter = () => {
  const [view, setView] = useState<LegalView>(null);
  const close = () => setView(null);

  return (
    <>
      <footer className="py-5 px-4 text-center border-t border-border mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-2">
          <button
            onClick={() => setView("tos")}
            className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            Terms of Service
          </button>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <button
            onClick={() => setView("privacy")}
            className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            Privacy Policy
          </button>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <button
            onClick={() => setView("2257")}
            className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            18 U.S.C. § 2257
          </button>
          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <button
            onClick={() => setView("contact")}
            className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors"
          >
            Contact
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
          © {new Date().getFullYear()} DTT Media LLC. All Rights Reserved. Must be 18+ to enter.
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
    <p>
      All models, actors, and other persons appearing in visual depictions of actual or simulated sexually explicit conduct on this website were at least 18 years of age at the time the visual depictions were created.
    </p>
    <p>
      <strong className="text-foreground">DTT Media LLC</strong> is the technology platform and operator of this website. However, per federal law, all content is uploaded by independent contractors (Creators). These Creators are the primary "Producers" of their content and are required by 18 U.S.C. § 2257 to maintain original records of age and identity verification for all individuals appearing in their content.
    </p>
    <p>
      All records required by law are maintained by the primary producer (the Creator) at the location specified in their individual records. DTT Media LLC maintains secondary records of identity and age for all Creators through our automated verification systems.
    </p>
    <p className="text-muted-foreground/60 text-[10px]">
      For compliance inquiries, contact: admin@dttmediallc.com
    </p>
  </SectionShell>
);

const TermsOfService = () => (
  <SectionShell title="Terms of Service">
    <p>
      <strong className="text-foreground">1. The Platform.</strong> DropThatThing (operated by DTT Media LLC) is a technology platform that facilitates social interaction and marketplace transactions between Customers and Independent Creators.
    </p>
    <p>
      <strong className="text-foreground">2. Age Requirement.</strong> You must be at least 18 years of age or the legal age of majority in your jurisdiction to access this site. Access by minors is strictly prohibited.
    </p>
    <p>
      <strong className="text-foreground">3. Relationship of Parties.</strong> Creators are independent contractors and are not employees, partners, or agents of DTT Media LLC. Creators are solely responsible for the content they upload and for their own local tax reporting.
    </p>
    <p>
      <strong className="text-foreground">4. Payments.</strong> All token purchases and custom requests are final. Payments are processed via third-party crypto/fiat gateways. DTT Media LLC charges a platform fee and an entry tax on transactions to maintain the infrastructure and security of the marketplace.
    </p>
    <p>
      <strong className="text-foreground">5. Content Policy.</strong> Users agree to log their IP address and timestamp upon entry as part of our legal compliance protocol.
    </p>
  </SectionShell>
);

const PrivacyPolicy = () => (
  <SectionShell title="Privacy Policy">
    <p>
      <strong className="text-foreground">1. Data Collection.</strong> DTT Media LLC collects account information, transaction history, and IP addresses. For Creators, we collect government-issued ID and "liveness" selfies to ensure platform safety and 18+ compliance.
    </p>
    <p>
      <strong className="text-foreground">2. Purpose of Processing.</strong> Verification data is used solely to confirm age and identity. Transaction data is used to facilitate payouts via the LTC network.
    </p>
    <p>
      <strong className="text-foreground">3. Third Parties.</strong> We may share data with payment processors (such as NOWPayments) and verification services to complete transactions and satisfy legal audits. We do not sell user data to third-party advertisers.
    </p>
  </SectionShell>
);

const ContactInfo = () => (
  <SectionShell title="Contact Us">
    <p>
      <strong className="text-foreground">DTT Media LLC</strong>
    </p>
    <p>
      Operator of DropThatThing. For all inquiries — support, compliance, partnerships, and legal matters — please contact our team at the email address below.
    </p>
    <p>
      <strong className="text-foreground">Support email:</strong>{" "}
      <a
        href="mailto:admin@dttmediallc.com"
        className="text-primary hover:underline"
      >
        admin@dttmediallc.com
      </a>
    </p>
  </SectionShell>
);

export default LegalFooter;
