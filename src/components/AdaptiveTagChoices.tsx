import { Checkbox } from "@/components/ui/checkbox";
import { ADAPTIVE_TAGS, ADAPTIVE_LABELS, type AdaptiveTag } from "@/lib/adaptiveTags";
export default function AdaptiveTagChoices({ value, onChange, disabled, filtering = false }: { value: AdaptiveTag[]; onChange: (tags: AdaptiveTag[]) => void; disabled?: boolean; filtering?: boolean }) {
  return <fieldset className="space-y-3 text-left">
    <legend className="text-xs font-semibold text-foreground">{filtering ? "Specialized / Adaptive Tags" : "Specialized / Adaptive Tags (Optional)"}</legend>
    {ADAPTIVE_TAGS.map(tag => <label key={tag} className="flex items-start gap-3 text-xs text-foreground cursor-pointer">
      <Checkbox className="mt-0.5 shrink-0" checked={value.includes(tag)} disabled={disabled} onCheckedChange={checked => onChange(checked === true ? [...value, tag] : value.filter(item => item !== tag))} />
      <span>{ADAPTIVE_LABELS[tag]}</span>
    </label>)}
    <p className="text-xs text-muted-foreground">{filtering ? "Match all selected tags." : "Selected tags appear on your creator profile and in discovery. Self-described, not disability verification. Optional and removable; tags do not change founding eligibility."}</p>
  </fieldset>;
}