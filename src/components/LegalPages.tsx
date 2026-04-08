import { useState } from "react";
import { ArrowLeft } from "lucide-react";

type Page = "tos" | "privacy";

const LegalPages = ({ initialPage = "tos", onBack }: { initialPage?: Page; onBack: () => void }) => {
  const [page, setPage] = useState<Page>(initialPage);

  return (
    <div className="min-h-screen pb-20">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground tracking-wider font-display">LEGAL</h1>
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {(["tos", "privacy"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${
              page === p ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
            }`}
          >
            {p === "tos" ? "TERMS" : "PRIVACY"}
          </button>
        ))}
      </div>

      <div className="px-4">
        <div className="bg-card border border-border rounded-xl p-5 text-xs text-muted-foreground space-y-4 leading-relaxed">
          {page === "tos" ? (
            <>
              <h2 className="text-base font-bold text-foreground">Terms of Service</h2>
              <p><span className="text-foreground font-medium">Last Updated:</span> April 8, 2026</p>

              <h3 className="text-sm font-semibold text-foreground mt-4">1. Acceptance of Terms</h3>
              <p>By accessing or using DROPTHATTHING ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

              <h3 className="text-sm font-semibold text-foreground">2. Eligibility</h3>
              <p>You must be at least 18 years of age to use this Platform. By using the Platform, you represent and warrant that you meet this age requirement.</p>

              <h3 className="text-sm font-semibold text-foreground">3. Bit-Token Economy</h3>
              <p>Bit-Tokens are digital access tokens valued at $20 USD each. They grant 14 calendar days of access to a single Creator's profile. Tokens are non-refundable once purchased. Access automatically expires after the 14-day period.</p>

              <h3 className="text-sm font-semibold text-foreground">4. No Refund Policy</h3>
              <p>All purchases of Bit-Tokens and Custom Requests are final. No refunds will be issued for digital token purchases, expired access periods, or declined custom requests.</p>

              <h3 className="text-sm font-semibold text-foreground">5. Revenue Split</h3>
              <p>The Platform operates on a 90% Creator / 10% Platform revenue split. A temporary 97/3 incentive split is available for Creators reaching 100,000 followers, lasting exactly 7 calendar days before reverting permanently.</p>

              <h3 className="text-sm font-semibold text-foreground">6. Hold Harmless Clause</h3>
              <p>You agree to hold harmless DROPTHATTHING, its owners, operators, and affiliates from any claims, damages, or losses arising from user-generated content, third-party interactions, or use of the Platform. The Platform acts solely as a technology provider and is not responsible for content created or shared by its users.</p>

              <h3 className="text-sm font-semibold text-foreground">7. Content Responsibility</h3>
              <p>Creators are solely responsible for the content they upload. The Platform reserves the right to remove any content that violates community guidelines or applicable law.</p>

              <h3 className="text-sm font-semibold text-foreground">8. Account Termination</h3>
              <p>The Platform reserves the right to suspend or terminate accounts that violate these Terms at any time without prior notice.</p>

              <h3 className="text-sm font-semibold text-foreground">9. Contact</h3>
              <p>For questions about these Terms, contact: <a href="mailto:dropthatthingmedia@gmail.com" className="text-primary underline">dropthatthingmedia@gmail.com</a></p>
            </>
          ) : (
            <>
              <h2 className="text-base font-bold text-foreground">Privacy Policy</h2>
              <p><span className="text-foreground font-medium">Last Updated:</span> April 8, 2026</p>

              <h3 className="text-sm font-semibold text-foreground mt-4">1. Information We Collect</h3>
              <p>We collect information you provide directly: email address, username, payment information (processed by third-party providers), and uploaded identity documents for Creator verification.</p>

              <h3 className="text-sm font-semibold text-foreground">2. How We Use Information</h3>
              <p>Your information is used to: operate and maintain your account, process transactions, verify Creator identities, send platform notifications, and improve our services.</p>

              <h3 className="text-sm font-semibold text-foreground">3. Data Security</h3>
              <p>We implement industry-standard security measures to protect your personal information. Identity verification documents are encrypted and stored securely.</p>

              <h3 className="text-sm font-semibold text-foreground">4. Third-Party Services</h3>
              <p>Payment processing is handled by third-party providers. We do not store credit card numbers or cryptocurrency wallet private keys on our servers.</p>

              <h3 className="text-sm font-semibold text-foreground">5. Data Retention</h3>
              <p>Account data is retained for the duration of your account's existence. Upon account deletion, personal data is removed within 30 days, except where retention is required by law.</p>

              <h3 className="text-sm font-semibold text-foreground">6. Contact</h3>
              <p>For privacy inquiries, contact: <a href="mailto:dropthatthingmedia@gmail.com" className="text-primary underline">dropthatthingmedia@gmail.com</a></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
