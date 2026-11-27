import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Save } from "lucide-react";
import { menuError, parseMenuItems, MAX_MENU_OPTIONS, type RequestMenu } from "@/lib/requestMenus";

const empty: RequestMenu = { enabled: false, open_requests: true, open_turnaround_days: 2, items: [] };
export default function CreatorRequestMenuBuilder() {
  const [menu, setMenu] = useState<RequestMenu>(empty);
  const [owner, setOwner] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in to manage your menu.");
      setOwner(user.id);
      const eligibility = await supabase.rpc("request_menu_creator_approved", { _creator: user.id });
      if (eligibility.error) throw eligibility.error;
      setApproved(eligibility.data === true);
      const result = await supabase.from("creator_request_menus").select("*").eq("creator_id", user.id).maybeSingle();
      if (result.error) throw result.error;
      if (result.data) setMenu({ ...result.data, items: parseMenuItems(result.data.items) });
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t load your menu. Please retry."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!owner || !approved || busy) return;
    const problem = menuError(menu); if (problem) { setError(problem); return; }
    setBusy(true); setError(""); setMessage("");
    const { error: failure } = await supabase.from("creator_request_menus").upsert({ creator_id: owner, ...menu, items: menu.items.map(item => ({ ...item })) });
    setBusy(false);
    if (failure) setError(failure.message); else setMessage("Menu saved.");
  };
  return <section className="space-y-4 border-b border-border pb-6">
    <h2 className="font-display text-lg font-bold text-primary">CUSTOM REQUEST MENU</h2>
    {loading ? <p role="status">Loading menu…</p> : <>
      {!approved && <p className="text-sm text-muted-foreground">Your menu opens after DTT approves your creator identity.</p>}
      <fieldset disabled={!approved || busy} className="space-y-4 disabled:opacity-60">
        <label className="flex items-center justify-between gap-3 text-sm">Custom requests<Switch checked={menu.enabled} onCheckedChange={enabled => setMenu(current => ({ ...current, enabled }))} aria-label="Custom requests enabled" /></label>
        <label className="flex items-center justify-between gap-3 text-sm">Custom amount / open requests<Switch checked={menu.open_requests} onCheckedChange={open_requests => setMenu(current => ({ ...current, open_requests }))} aria-label="Open requests enabled" /></label>
        {menu.open_requests && <label className="block text-sm">Open request turnaround (days)<Input type="number" min={1} max={365} value={menu.open_turnaround_days} onChange={e => setMenu(current => ({ ...current, open_turnaround_days: Number(e.target.value) }))} /></label>}
        <div className="space-y-3">{menu.items.map((item, index) => {
          const change = (patch: Partial<typeof item>) => setMenu(current => ({ ...current, items: current.items.map((row, i) => i === index ? { ...row, ...patch } : row) }));
          return <div key={index} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Option {index + 1}</h3><Button variant="ghost" size="icon" title="Remove option" aria-label={`Remove option ${index + 1}`} onClick={() => setMenu(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))}><Trash2 className="h-4 w-4" /></Button></div>
            <label className="block text-sm">Title<Input maxLength={80} value={item.title} onChange={e => change({ title: e.target.value })} /></label>
            <label className="block text-sm">What’s included<Textarea maxLength={500} value={item.description} onChange={e => change({ description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3"><label className="text-sm">Base price ($)<Input type="number" min={25} step="0.01" value={item.price_usd || ""} onChange={e => change({ price_usd: Number(e.target.value) })} /></label><label className="text-sm">Turnaround days<Input type="number" min={1} max={365} value={item.turnaround_days || ""} onChange={e => change({ turnaround_days: Number(e.target.value) })} /></label></div>
            <p className="text-xs text-muted-foreground">You keep 85% of the request price. The buyer pays the $5 checkout fee separately.</p>
          </div>;
        })}</div>
        <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={menu.items.length >= MAX_MENU_OPTIONS} onClick={() => setMenu(current => ({ ...current, items: [...current.items, { title: "", description: "", price_usd: 25, turnaround_days: 2 }] }))}><Plus className="mr-2 h-4 w-4" />ADD OPTION ({menu.items.length}/6)</Button><Button variant="neon" onClick={() => void save()}><Save className="mr-2 h-4 w-4" />{busy ? "SAVING…" : "SAVE MENU"}</Button></div>
      </fieldset>
    </>}
    {error && <div><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="ghost" onClick={() => void load()}>RETRY LOADING</Button></div>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
  </section>;
}