import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getTargetLang } from "@/components/AutoTranslator";
import { languageDirection } from "@/lib/uiTranslation";
import { fillCopy, foundingCongratsCopy } from "@/lib/foundingCongratsText";

type Slot = { slot: number; country: string; vault_side: string; split_creator: number; split_platform: number; ends_at: string };

/** One-time congratulations for a creator who holds a founding slot, in the creator's chosen language. */
const FoundingCongrats = ({ userId, preview }: { userId: string; preview?: Slot }) => {
  const [slot, setSlot] = useState<Slot | null>(preview ?? null);
  const key = `dtt-founding-congrats:${userId}`;
  useEffect(() => {
    if (preview || localStorage.getItem(key)) return;
    void supabase.from("founding_creators").select("slot,country,vault_side,split_creator,split_platform,ends_at").eq("creator_id", userId).maybeSingle()
      .then(({ data }) => { if (data && new Date(data.ends_at) > new Date()) setSlot(data); });
  }, [userId, key, preview]);
  if (!slot) return null;
  const lang = getTargetLang();
  const t = foundingCongratsCopy(lang);
  let country = slot.country;
  try { country = new Intl.DisplayNames([lang], { type: "region" }).of(slot.country) ?? slot.country; } catch { /* keep code */ }
  let date = slot.ends_at.slice(0, 10);
  try { date = new Date(slot.ends_at).toLocaleDateString(lang, { dateStyle: "medium" }); } catch { /* keep ISO */ }
  const v = { n: slot.slot, c: country, s: `${slot.split_creator}/${slot.split_platform}`, d: date };
  const close = () => { localStorage.setItem(key, "1"); setSlot(null); };
  return (
    <div className="notranslate fixed inset-0 z-[200] flex items-center justify-center bg-background/80 p-4" translate="no" lang={lang} dir={languageDirection(lang)} role="dialog" aria-modal="true" aria-labelledby="founding-congrats-title">
      <div className="w-full max-w-sm rounded-2xl border border-gold bg-card p-6 text-center shadow-2xl space-y-3">
        <p className="text-4xl" aria-hidden>🏆</p>
        <h2 id="founding-congrats-title" className="text-xl font-bold text-gold">{t.title}</h2>
        <p className="text-sm text-foreground">{fillCopy(slot.vault_side === "men" ? t.man : t.woman, v)}</p>
        <p className="text-sm text-muted-foreground">{fillCopy(t.body, v)}</p>
        <Button variant="gold" className="w-full" onClick={close}>{t.button}</Button>
      </div>
    </div>
  );
};
export default FoundingCongrats;
