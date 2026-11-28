import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import CreatorLaunchCountdown from "@/components/CreatorLaunchCountdown";
import LegalFooter from "@/components/LegalFooter";
import CreatorRevenueTerms from "@/components/CreatorRevenueTerms";
import sky from "@/assets/dtt-pink-galaxy-share.jpg.asset.json";
import { CREATOR_SIGNUP_URL, CUSTOMER_WAITLIST_URL, FOUNDING_INVITATION_URL, FOUNDING_OFFER } from "@/lib/foundingInvitation";

const description = "Free private creator setup on DTT. Learn about limited lifetime 91/9 founding places, adult verification, residence eligibility and pre-launch readiness.";

export default function FoundingCreators() {
  const [shareStatus, setShareStatus] = useState("");
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "DTT · Founding creator invitation", url: FOUNDING_INVITATION_URL });
      else { await navigator.clipboard.writeText(FOUNDING_INVITATION_URL); setShareStatus("Invitation link copied."); }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setShareStatus("Copy the invitation address below to share it.");
    }
  }
  return <div className="dtt-founding-invitation min-h-screen bg-background text-foreground">
    <Helmet>
      <title>Founding Creator Invitation — Drop That Thing™</title>
      <meta name="description" content={description} />
      <meta property="og:title" content="DTT · Founding Creator Invitation" />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={FOUNDING_INVITATION_URL} />
      <meta name="twitter:card" content="summary" />
      <link rel="canonical" href={FOUNDING_INVITATION_URL} />
    </Helmet>
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-border px-5 pb-4 pt-20 sm:px-8">
      <Button variant="link" asChild className="h-auto p-0 font-display text-sm text-foreground"><Link to="/" translate="no" className="notranslate">DTT™</Link></Button>
      <Button variant="outline" size="sm" onClick={() => void share()}>SHARE INVITATION</Button>
    </header>
    <main>
      <section className="relative isolate overflow-hidden border-b border-primary/40 px-5 py-10 text-center sm:py-14">
        <img src={sky.url} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-background/40" aria-hidden="true" />
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-gold">THE FOUNDING ERA · 18+ CREATORS</p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl notranslate" translate="no">Drop That Thing<span className="text-primary">™</span></h1>
          <h2 className="mx-auto mt-5 max-w-lg text-3xl font-semibold leading-tight">Twerk for an audience.<br /><span className="text-primary">Make the stage yours.</span></h2>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed">Fast or slow. Your style. Your spotlight.</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed">Build your creator profile before DTT’s global twerking feed opens. Free private setup is open now.</p>
          <p className="mt-5 text-lg font-semibold text-gold">Founding creators: 91% of eligible vault earnings. For life.</p>
          <p className="mt-2 text-xs">First 5 qualifying approved creators per category, per country. Eligibility and available places apply.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button variant="neon" size="lg" asChild className="h-auto min-h-12 max-w-full whitespace-normal"><Link to={CREATOR_SIGNUP_URL}>BECOME A CREATOR — FREE</Link></Button>
            <p className="text-xs">18+ only · Private ID & content-consent review before publishing · No purchase to begin</p>
          </div>
          <CreatorLaunchCountdown compact />
        </div>
      </section>
      <section className="border-b border-primary/40 bg-secondary/30 px-5 py-8 text-center" aria-labelledby="customer-invitation">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-semibold text-primary">HERE TO WATCH?</p>
          <h2 id="customer-invitation" className="mt-2 text-2xl font-semibold">Your DTT ticket starts here.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Join the customer waiting list free before launch. Lock in $10 a year for life instead of $20 for annual entry to DTT’s global twerking feed when viewing opens.</p>
          <Button variant="outline" size="lg" asChild className="mt-5 h-auto min-h-12 max-w-full whitespace-normal border-primary text-primary"><Link to={CUSTOMER_WAITLIST_URL}>GET MY CUSTOMER TICKET</Link></Button>
          <p className="mt-3 text-xs text-muted-foreground">18+ only. Nothing charged today. Paid creator libraries require separate Bit-Tokens. We’re getting payments ready for launch; payment invitations are not open yet.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="founding-offer">
        <p className="text-sm font-medium text-primary">The founding offer</p>
        <h2 id="founding-offer" className="mt-2 text-3xl font-bold">{FOUNDING_OFFER.creatorPercent}% creator share. For life.</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>Ahead of the January 1, 2027 public launch, eligible pre-launch creator signups may reserve up to 20 Founding Creator spots per country: the first {FOUNDING_OFFER.placesPerCategory} qualifying approved creators in each of DTT’s four categories.</p>
            <p>Founding Creators receive a {FOUNDING_OFFER.creatorPercent}% creator / {FOUNDING_OFFER.platformPercent}% platform revenue split on eligible Bit-Token vault transactions for life. Custom requests and other transaction types follow their separately disclosed rates.</p>
            <p>Signing up alone does not guarantee a spot or a VIP pass; identity, age, residence, category and content-clearance requirements and remaining availability apply. Pro and Elite passes are separate paid products. DTT has no recurring subscriptions or pay-per-view fees.</p>
          </div>
          <div className="border-l-2 border-gold pl-5">
            <p className="text-lg font-semibold text-foreground">What 91% means</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A Bit-Token has ${FOUNDING_OFFER.tokenValueUsd} spending value. A qualifying vault unlock at 91% allocates $18.20 to the creator and $1.80 to DTT, before applicable adjustments and your taxes. It is not 91% of the checkout price.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This is a revenue split, not a salary or promised income. Custom requests use 85/15, or 90/10 only for payment-verified Elite holders. Creator payouts are planned through a crypto processor, including Litecoin (LTC), or into the creator’s bank account, subject to provider approval, country availability and final payout checks. We’re preparing payments and payouts for launch; sales are not open yet.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl border-t border-border px-5 py-8 sm:px-8" aria-labelledby="earnings-terms">
        <h2 id="earnings-terms" className="mb-5 text-2xl font-bold">Your earnings, clearly explained</h2>
        <CreatorRevenueTerms />
      </section>
      <section className="border-y border-border bg-secondary/30" aria-labelledby="eligibility">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
          <h2 id="eligibility" className="text-2xl font-bold">Who can qualify?</h2>
          <ul className="mt-6 grid list-disc gap-x-12 gap-y-4 pl-5 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
            <li>You must be at least 18, or the legal age of majority where you live if higher, and pass DTT’s private identity and age review.</li>
            <li>Your actual country of residence must be reviewed using a current address-bearing government photo ID. A profile country or nationality alone does not qualify.</li>
            <li>Choose an accurate creator category and at least one content label, and accept the creator safety agreement and creator agreement.</li>
            <li>Your country must be permitted by DTT and applicable law. A founding place must still be available in your country and category.</li>
            <li>Only publish content you have rights to distribute. Everyone appearing must have been an adult when it was recorded and give content-specific permission.</li>
            <li>Identity and participant/content clearance are required before publishing or customer access. Sandbox checks cannot approve a real creator.</li>
          </ul>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8" aria-labelledby="prelaunch">
        <h2 id="prelaunch" className="text-2xl font-bold">Start privately. Launch when ready.</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            ["01", "Create your account", "Complete the 18+ entry consents, register for free, and confirm your email."],
            ["02", "Make it yours", "Choose your category and labels, personalize your profile, and begin private verification and eligible draft preparation."],
            ["03", "Get reviewed", "DTT reviews your evidence and founding eligibility. Public content and paid access remain gated until the required approvals are complete."],
          ].map(([number, title, text]) => <div key={number} className="border-t border-border pt-4"><span className="text-sm font-semibold text-primary">{number}</span><h3 className="mt-2 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p></div>)}
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">Launching January 1, 2027 at midnight in New York. Start your free private creator setup now while we get payments and payouts ready for launch. Sales will open after payment approval and final checks; publishing also requires identity and content clearance.</p>
        <div className="mt-8 flex flex-col items-start gap-4">
          <Button variant="neon" size="lg" asChild className="h-auto min-h-12 max-w-full whitespace-normal"><Link to={CREATOR_SIGNUP_URL}>START FREE CREATOR SETUP</Link></Button>
          <p className="text-sm text-muted-foreground">Questions or feedback? <a className="break-all text-primary underline" href="mailto:dropthatthingmedia@gmail.com">dropthatthingmedia@gmail.com</a></p>
          <p role="status" className="text-sm text-primary">{shareStatus}</p>
          <a href={FOUNDING_INVITATION_URL} translate="no" className="notranslate break-all text-xs text-muted-foreground">{FOUNDING_INVITATION_URL}</a>
        </div>
      </section>
    </main>
    <LegalFooter />
  </div>;
}