import { ADAPTIVE_LABELS, parseAdaptiveTags } from "@/lib/adaptiveTags";
export default function AdaptiveTagBadges({ tags }: { tags: unknown }) {
  const selected = parseAdaptiveTags(tags);
  if (!selected.length) return null;
  return <div className="flex flex-wrap justify-center gap-2 mt-2" aria-label="Self-described adaptive tags">
    {selected.map(tag => <span key={tag} className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">{ADAPTIVE_LABELS[tag]}</span>)}
  </div>;
}