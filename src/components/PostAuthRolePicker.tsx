import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, Star } from "lucide-react";
import type { UserRole } from "@/components/RoleSelection";
import type { VaultType } from "@/lib/tokenEconomy";
import LegalFooter from "@/components/LegalFooter";
import { useCreatorText } from "@/i18n/creator";
import { CATEGORY_LABELS, CREATOR_CATEGORIES, type CreatorCategory } from "@/lib/creatorCategories";
import { validContentLabels } from "@/lib/contentLabels";
import ContentLabelChoices from "./ContentLabelChoices";
import ContentLabelingNotice from "@/components/ContentLabelingNotice";
import AdaptiveTagChoices from "@/components/AdaptiveTagChoices";
import type { AdaptiveTag } from "@/lib/adaptiveTags";
import CreatorLaunchCountdown from "@/components/CreatorLaunchCountdown";

interface PostAuthRolePickerProps {
  email?: string;
  onSelect: (role: UserRole, creatorSide?: VaultType, labels?: string[], adaptiveTags?: AdaptiveTag[]) => Promise<void>;
}

const PostAuthRolePicker = ({ email, onSelect }: PostAuthRolePickerProps) => {
  const [pickingSide, setPickingSide] = useState(false);
  const [category, setCategory] = useState<CreatorCategory | "">("");
  const [labels, setLabels] = useState<string[]>([]);
  const [adaptiveTags, setAdaptiveTags] = useState<AdaptiveTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (role: UserRole) => { setBusy(true); setError(""); try { await onSelect(role, category || undefined, labels, adaptiveTags); } catch { setError("Couldn’t save your profile. Please retry."); } finally { setBusy(false); } };
  const ct = useCreatorText();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-foreground mb-1">
            <span className="notranslate" translate="no">DROPTHAT<span className="text-primary">THING™</span></span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {email ? ct.signed_in_as(email) : ct.signed_in}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {pickingSide ? ct.which_vault : ct.who_are_you}
          </p>
        </div>

        {pickingSide ? (
          <div className="flex flex-col gap-3 w-full">
            <CreatorLaunchCountdown compact />
            <p className="text-left text-sm text-foreground">Set up your creator profile privately. Identity review and approval of everyone appearing in your content are required before publishing.</p>
            <label className="text-left text-sm font-semibold text-foreground">Profile Category
              <select required value={category} disabled={busy} onChange={event => setCategory(event.target.value as CreatorCategory)} className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                <option value="" disabled>Select category</option>
                {CREATOR_CATEGORIES.map(value => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
              </select>
            </label>
            <ContentLabelChoices value={labels} onChange={setLabels} disabled={busy} />
            <AdaptiveTagChoices value={adaptiveTags} onChange={setAdaptiveTags} disabled={busy} />
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            <Button variant="neon" disabled={busy || !category || !validContentLabels(labels)} onClick={() => void submit("creator")}>CONTINUE</Button>
            <ContentLabelingNotice />
            <Button
              variant="ghost" disabled={busy}
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground tracking-widest mt-1"
              onClick={() => setPickingSide(false)}
            >
              {ct.back}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <Button
              variant="neon"
              size="lg"
              className="w-full text-base font-semibold gap-2"
              onClick={() => setPickingSide(true)}
            >
              <Star className="w-5 h-5" />
              {ct.im_creator}
            </Button>
            <p className="text-center text-xs font-bold tracking-widest text-primary">
              {ct.founding}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="w-full text-base font-semibold gap-2 border-primary/30 hover:border-primary hover:text-primary"
              disabled={busy} onClick={() => void submit("customer")}
            >
              <Users className="w-5 h-5" />
              {ct.im_customer}
            </Button>
          </div>
        )}

      </div>
      <LegalFooter />
      </div>
    </div>
  );
};

export default PostAuthRolePicker;
