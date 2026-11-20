import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import CreatorLaunchCountdown from "@/components/CreatorLaunchCountdown";
import LegalFooter from "@/components/LegalFooter";
import sky from "@/assets/brb/stars-cluster.jpg";
import { CREATOR_SIGNUP_URL, FOUNDING_INVITATION_URL, FOUNDING_OFFER } from "@/lib/foundingInvitation";

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
  return <div className="min-h-screen bg-background text-foreground">
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
      <section className="relative isolate overflow-hidden border-b border-border px-5 py-10 text-center sm:py-14">
        <img src={sky} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-background/70" aria-hidden="true" />
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-gold">Founding creator invitation · 18+ only</p>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-5xl notranslate" translate="no">Drop That Thing<span className="text-primary">™</span></h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed">Your content. Your audience. A place to build something of your own.</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">Join DTT’s adult creator marketplace before launch. Set up privately, explore your creator tools, and help shape what comes next.</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button variant="neon" size="lg" asChild className="h-auto min-h-12 max-w-full whitespace-normal"><Link to={CREATOR_SIGNUP_URL}>START FREE CREATOR SETUP</Link></Button>
            <p className="text-xs text-muted-foreground">Free account and private setup. No purchase required to begin.</p>
          </div>
          <CreatorLaunchCountdown compact />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14" aria-labelledby="founding-offer">
        <p className="text-sm font-medium text-primary">The founding offer</p>
        <h2 id="founding-offer" className="mt-2 text-3xl font-bold">{FOUNDING_OFFER.creatorPercent}% creator share. For life.</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>The first {FOUNDING_OFFER.placesPerCategory} qualifying approved creators in each category per country receive a lifetime {FOUNDING_OFFER.creatorPercent}/{FOUNDING_OFFER.platformPercent} split on eligible vault earnings.</p>
            <p>There are 20 founding places per country across DTT’s four creator categories. Places depend on approved eligibility and remaining availability—not simply signing up.</p>
            <p>Joining is not a reserved founding place or a VIP pass. Pro and Elite passes are separate paid products.</p>
          </div>
          <div className="border-l-2 border-gold pl-5">
            <p className="text-lg font-semibold text-foreground">What 91% means</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A Bit-Token has ${FOUNDING_OFFER.tokenValueUsd} spending value. A qualifying vault unlock at 91% allocates $18.20 to the creator and $1.80 to DTT, before applicable adjustments and your taxes. It is not 91% of the checkout price.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This is a revenue split, not a salary or promised income. Custom requests have separate terms. Payouts are planned as manual Litecoin (LTC) payments; paid launch still requires approved payments and working payouts.</p>
          </div>
        </div>
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
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">Launching January 1, 2027 at midnight in New York. Private creator onboarding is open now; payment approval, verified transactions, working payouts and content clearance are still required for paid launch. Signing up does not activate sales or earnings.</p>
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