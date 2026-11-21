export default function DttFutureAnnouncement({ expanded = false }: { expanded?: boolean }) {
  return <section aria-label="DTT future plans" className="mx-auto w-full max-w-xl border-y border-primary/30 px-4 py-4 text-left">
    <details open={expanded || undefined}>
      <summary className="cursor-pointer font-display text-sm font-semibold text-primary">DTT’S NEXT CHAPTER · GALAXY GAMING & BIT-TOKEN MINE</summary>
      <div className="mt-3 space-y-4 text-sm">
        <p className="text-foreground">Imagine flying through DTT’s pink galaxy—exploring new worlds, connecting with creators and customers, and playing together among the stars.</p>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-primary">A planet for every creator country</h3>
          <p className="text-foreground">Picture each country represented by its own planet, home to its creators. Customers from around the world could travel at warp speed between planets to explore, connect and challenge creators in friendly space combat.</p>
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-primary">Best of three · a chance to win 14 days</h3>
          <p className="text-foreground">The battle concept: win two of three rounds against a participating creator for a chance to earn 14 days of access to that creator’s content. Participation would be optional; any future reward would need funded, approved rules and DTT’s age and content safeguards.</p>
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-primary">Your galaxy fighter</h3>
          <p className="text-foreground">Creators and customers could build their own fighter avatars for upcoming battles. For creators, we envision a custom fighter avatar and generated fighter jet reserved exclusively for the gaming world—not a replacement for their creator profile.</p>
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-primary">Explore · discover · mine</h3>
          <p className="text-foreground">Beyond battles, imagine exploring the galaxy in search of Bit-Tokens or visiting DTT’s virtual Bit-Token mine. A whole new adventure, built around the community that starts here.</p>
        </div>
        <p className="text-muted-foreground">Our year-end 2026 vision for DTT’s next chapter: grow the creator platform first, then explore galaxy gaming as revenue can support it.</p>
        <p className="text-xs text-muted-foreground">Future concepts only, with no scheduled release. Fighter creation, jets, battles, mining and rewards are not available today. No access or Bit-Tokens are granted by this announcement.</p>
      </div>
    </details>
  </section>;
}