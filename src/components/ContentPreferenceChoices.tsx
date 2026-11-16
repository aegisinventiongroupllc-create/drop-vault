import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_LABELS, CREATOR_CATEGORIES, type CreatorCategory } from "@/lib/creatorCategories";
export default function ContentPreferenceChoices({ value, onChange, disabled = false }: { value: CreatorCategory[]; onChange: (categories: CreatorCategory[]) => void; disabled?: boolean }) {
  return <fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold text-foreground">Content Preferences</legend>
    {CREATOR_CATEGORIES.map(category => <label key={category} className="flex items-center gap-3 text-sm text-foreground"><Checkbox disabled={disabled} checked={value.includes(category)} onCheckedChange={checked => onChange(checked ? [...value, category] : value.filter(item => item !== category))} />{CATEGORY_LABELS[category]}</label>)}
  </fieldset>;
}