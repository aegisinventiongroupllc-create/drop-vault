import { Checkbox } from "@/components/ui/checkbox";
import { ADAPTIVE_TAGS, ADAPTIVE_LABELS, type AdaptiveTag } from "@/lib/adaptiveTags";
export default function AdaptiveTagChoices({ value, onChange, disabled, filtering = false }: { value: AdaptiveTag[]; onChange: (tags: AdaptiveTag[]) => void; disabled?: boolean; filtering?: boolean }) {
  return <fieldset className="space-y-3 text-left">
    <legend className="text-xs font-semibold text-foreground">{filtering ? "Specialized / Adaptive Tags" : "Specialized / Adaptive Tags (Optional)"}</legend>
    <div className="max-h-64 overflow-y-auto overscroll-contain space-y-3 py-1 pr-2">
    {ADAPTIVE_TAGS.map(tag => <label key={tag} className="flex min-h-6 items-start gap-3 text-xs text-foreground cursor-pointer">
      <Checkbox className="mt-0.5 shrink-0" checked={value.includes(tag)} disabled={disabled} onCheckedChange={checked => onChange(checked === true ? [...value, tag] : value.filter(item => item !== tag))} />
      <span className="min-w-0 leading-5">{ADAPTIVE_LABELS[tag]}</span>
    </label>)}
    </div>
    <p className="text-xs text-muted-foreground">{filtering ? "Match all selected tags. Leave unchecked for no specialized preference. Your browsing choices are private." : "Selected tags appear on your creator profile and in discovery. Self-described, not identity or disability verification. Optional and removable; tags do not change founding eligibility."}</p>
  </fieldset>;
}