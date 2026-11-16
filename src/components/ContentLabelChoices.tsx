import { Checkbox } from "@/components/ui/checkbox";
import { CONTENT_LABELS } from "@/lib/contentLabels";
export default function ContentLabelChoices({ value, onChange, disabled = false }: { value: string[]; onChange: (labels: string[]) => void; disabled?: boolean }) {
  return <fieldset className="space-y-2 text-left"><legend className="mb-2 text-sm font-semibold text-foreground">Content labels</legend>
    <div className="grid grid-cols-2 gap-3">{Object.entries(CONTENT_LABELS).map(([key, label]) => <label key={key} className="flex items-start gap-2 text-xs text-foreground"><Checkbox disabled={disabled} checked={value.includes(key)} onCheckedChange={checked => onChange(checked ? [...value, key] : value.filter(item => item !== key))} />{label}</label>)}</div>
  </fieldset>;
}