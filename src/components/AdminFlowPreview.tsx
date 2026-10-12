import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ENTRY_PASS_PRICE_USD } from "@/lib/tokenEconomy";

type Path = "creator" | "customer";

interface Step {
  label: string;
  note: string;
  screen: JSX.Element;
}

const Brand = () => (
  <h1 className="font-display text-lg font-bold tracking-wider text-foreground">
    DROPTHAT<span className="text-primary">THING</span>
  </h1>
);

const FakeInput = ({ text }: { text: string }) => (
  <div className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-left text-xs text-muted-foreground">{text}</div>
);

const RoleScreen = ({ picked }: { picked: Path }) => (
  <div className="space-y-4 text-center">
    <Brand />
    <p className="text-xs text-muted-foreground">Who are you?</p>
    <div className={`rounded-lg py-2.5 text-xs font-bold tracking-widest border ${picked === "creator" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>I'M A CREATOR</div>
    <div className={`rounded-lg py-2.5 text-xs font-bold tracking-widest border ${picked === "customer" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>I'M A CUSTOMER</div>
  </div>
);

const AccountScreen = () => (
  <div className="space-y-3 text-center">
    <Brand />
    <p className="text-xs text-muted-foreground">Create your account to get started.</p>
    <FakeInput text="name@email.com" />
    <FakeInput text="••••••••" />
    <div className="rounded-lg bg-primary py-2.5 text-xs font-bold tracking-widest text-primary-foreground">CREATE ACCOUNT</div>
    <p className="text-[10px] text-muted-foreground">Stays signed in on this phone until they log out.</p>
  </div>
);

const PassScreen = () => (
  <div className="space-y-3 text-center">
    <p className="font-display text-2xl font-bold tracking-[0.35em] text-primary">DTT</p>
    <p className="text-[10px] font-bold tracking-[0.3em] text-gold">VAULT ENTRY PASS</p>
    <p className="font-display text-xl font-bold">${ENTRY_PASS_PRICE_USD} / YEAR</p>
    <div className="rounded-xl border border-border bg-card p-3 text-left text-[10px] text-muted-foreground space-y-1">
      <p>365 days of browsing both Vaults</p>
      <p>Follow, heart and request creators</p>
      <p>Bit-Tokens bought separately</p>
    </div>
    <div className="rounded-lg bg-primary py-2.5 text-xs font-bold tracking-widest text-primary-foreground">GET MY ENTRY PASS — ${ENTRY_PASS_PRICE_USD}</div>
  </div>
);

const VaultSideScreen = () => (
  <div className="space-y-4 text-center">
    <Brand />
    <p className="text-xs text-muted-foreground">Which Vault are you in?</p>
    <div className="rounded-lg border border-primary bg-primary py-2.5 text-xs font-bold tracking-widest text-primary-foreground">WOMEN'S VAULT</div>
    <div className="rounded-lg border border-border bg-secondary py-2.5 text-xs font-bold tracking-widest text-muted-foreground">MEN'S VAULT</div>
  </div>
);

const VerifyScreen = () => (
  <div className="space-y-3 text-center">
    <Brand />
    <p className="text-xs font-bold tracking-widest text-foreground">18+ ID CHECK</p>
    <FakeInput text="Legal name + date of birth" />
    <FakeInput text="ID front, ID back, dated selfie" />
    <p className="text-[10px] text-muted-foreground">Private. You approve it in VERIFY before they can upload.</p>
  </div>
);

const CreatorReturnScreen = () => (
  <div className="space-y-3 text-center">
    <p className="text-[10px] font-bold tracking-[0.3em] text-gold">WHILE YOU WERE AWAY...</p>
    <p className="font-display text-3xl font-bold text-gold">$54.00</p>
    <p className="text-xs text-muted-foreground">3 Bit-Tokens earned</p>
    <div className="rounded-lg bg-primary py-2.5 text-xs font-bold tracking-widest text-primary-foreground">VIEW ANALYTICS</div>
    <p className="text-[10px] text-muted-foreground">Sample numbers. Real creators see what they actually earned.</p>
  </div>
);

const CustomerReturnScreen = () => (
  <div className="space-y-3 text-center">
    <Brand />
    <div className="aspect-[9/12] w-full rounded-xl border border-border bg-card flex items-end p-3">
      <div className="text-left">
        <p className="text-xs font-semibold text-foreground">@creator</p>
        <p className="text-[10px] text-primary">Teaser plays here</p>
      </div>
    </div>
    <p className="text-[10px] text-muted-foreground">Pass and login remembered. No need to pay again for the year.</p>
  </div>
);

const STEPS: Record<Path, Step[]> = {
  creator: [
    { label: "Who are you?", note: "The first screen asks Creator or Customer.", screen: <RoleScreen picked="creator" /> },
    { label: "Make an account", note: "Email and password. The choice of Creator is saved to their account.", screen: <AccountScreen /> },
    { label: "Pick a side", note: "Women's or Men's Vault, saved to their profile.", screen: <VaultSideScreen /> },
    { label: "18+ check", note: "ID and selfie, kept private. Creators never pay the entry fee.", screen: <VerifyScreen /> },
    { label: "Next time they open the app", note: "Straight to their dashboard with the gold coin welcome-back showing what they made while away.", screen: <CreatorReturnScreen /> },
  ],
  customer: [
    { label: "Who are you?", note: "The first screen asks Creator or Customer.", screen: <RoleScreen picked="customer" /> },
    { label: "Make an account", note: "Email and password, saved so they stay signed in.", screen: <AccountScreen /> },
    { label: "Pay the entry fee", note: `The $${ENTRY_PASS_PRICE_USD} yearly pass, by card or crypto. The feed stays locked until it's paid.`, screen: <PassScreen /> },
    { label: "Next time they open the app", note: "Straight to the teaser feed. Their pass and login are remembered.", screen: <CustomerReturnScreen /> },
  ],
};

const AdminFlowPreview = () => {
  const [path, setPath] = useState<Path>("customer");
  const [step, setStep] = useState(0);
  const steps = STEPS[path];
  const current = steps[step];

  const choose = (p: Path) => { setPath(p); setStep(0); };

  return (
    <div className="px-4 space-y-4">
      <div className="bg-card border border-primary/30 rounded-xl p-4 text-center">
        <h3 className="text-lg font-bold tracking-wider text-foreground">HOW THE APP WORKS</h3>
        <p className="text-xs text-muted-foreground mt-1">Walk through what a new creator or customer sees, step by step. Nothing here charges money or makes accounts.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant={path === "customer" ? "neon" : "outline"} onClick={() => choose("customer")}>CUSTOMER PATH</Button>
        <Button size="sm" variant={path === "creator" ? "neon" : "outline"} onClick={() => choose("creator")}>CREATOR PATH</Button>
      </div>

      <div className="flex justify-center gap-1.5">
        {steps.map((s, i) => (
          <button key={s.label} aria-label={`Step ${i + 1}`} onClick={() => setStep(i)}
            className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
        ))}
      </div>

      <div className="mx-auto w-full max-w-[260px] rounded-[2rem] border-4 border-border bg-background p-5 min-h-[420px] flex items-center">
        <div className="w-full">{current.screen}</div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[10px] font-bold tracking-widest text-primary">STEP {step + 1} OF {steps.length}</p>
        <p className="text-sm font-bold text-foreground">{current.label}</p>
        <p className="text-xs text-muted-foreground">{current.note}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>BACK</Button>
        <Button variant="neon" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>NEXT</Button>
      </div>
    </div>
  );
};

export default AdminFlowPreview;
