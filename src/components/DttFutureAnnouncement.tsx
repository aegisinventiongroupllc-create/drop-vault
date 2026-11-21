export default function DttFutureAnnouncement({ expanded = false }: { expanded?: boolean }) {
  return <section aria-label="DTT future plans" className="mx-auto w-full max-w-xl border-y border-primary/30 px-4 py-4 text-left">
    <details open={expanded || undefined}>
      <summary className="cursor-pointer font-display text-sm font-semibold text-primary">DTT’S NEXT CHAPTER · GALAXY GAMING & BIT-TOKEN MINE</summary>
      <div className="mt-3 space-y-2 text-sm">
        <p className="text-foreground">Imagine flying through DTT’s pink galaxy—exploring new worlds, connecting with creators and customers, and playing together among the stars.</p>
        <p className="text-foreground">Choose your adventure: friendly space battles with other customers or creators, galaxy exploration in search of Bit-Tokens, or a visit to DTT’s virtual Bit-Token mine.</p>
        <p className="text-muted-foreground">We’re exploring this next chapter for 2027–2028, including activities that could reward Bit-Tokens. You’re here at the beginning.</p>
        <p className="text-xs text-muted-foreground">Future concepts, not a scheduled release. Games and token rewards are not available today; rewards, eligibility and funding are still being considered.</p>
      </div>
    </details>
  </section>;
}