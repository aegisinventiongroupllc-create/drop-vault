import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { identityAge } from "@/lib/identityVerification";
import { validIdentityExpiry } from "@/lib/creatorDraftRules";
import { Link } from "react-router-dom";
interface Row { id: string; user_id: string; legal_first_name: string; legal_last_name: string; date_of_birth: string; id_front_path: string; id_back_path: string; selfie_path: string; status: string; reviewer_notes: string | null; reviewed_at: string | null; submitted_at: string; email?: string; display_name?: string; country?: string; document_expires_on?: string; document_type?: string; issuing_country?: string; document_number?: string; }
const REASONS = ["Blurry photo", "Expired document", "Unreadable document details", "Holding note missing date", "Holding note missing username", "ID or face does not match", "Under 18"];
export default function AdminVerifications() {
  const [access, setAccess] = useState<"loading" | "signed-out" | "denied" | "admin">("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("pending");
  const [country, setCountry] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Row | null>(null);
  const [urls, setUrls] = useState<Record<string,string>>({});
  const [imageError, setImageError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [residenceCountry, setResidenceCountry] = useState("");
  const [residenceConfirmed, setResidenceConfirmed] = useState(false);
  const [decline, setDecline] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const call = async (body: Record<string,unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-verifications", { body });
    if (error) { const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null; throw new Error(details?.error ?? error.message); }
    if (data?.error) throw new Error(data.error);
    return data;
  };
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (active) setAccess("signed-out"); return; }
      const { data, error } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      if (active) setAccess(!error && data === true ? "admin" : "denied");
    };
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => { setTimeout(check, 0); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const load = useCallback(async () => {
    if (access !== "admin") return;
    setLoading(true); setError("");
    try { const data = await call({ action: "list", filter, offset, ...(country ? { country } : {}), query }); setRows(data.rows); setTotal(data.total); }
    catch (error) { setRows([]); setError(error instanceof Error ? error.message : "Unable to load records"); }
    finally { setLoading(false); }
  }, [access, filter, offset, country, query]);
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  const review = (row: Row) => { setOpen(row); setNotes(""); setConfirmed(false); setResidenceConfirmed(false); setResidenceCountry(row.country ?? ""); setDecline(false); };
  useEffect(() => {
    if (!open) return;
    let active = true;
    setUrls({}); setImageError("");
    const sign = async () => {
      try { const data = await call({ action: "signed_urls", id: open.id }); if (active) setUrls(data.urls); }
      catch { if (active) setImageError("Could not load private documents. Close and retry."); }
    };
    void sign();
    const timer = setInterval(sign, 240000);
    return () => { active = false; clearInterval(timer); };
  }, [open]);
  const decide = async (status: "approved" | "rejected" | "flagged") => {
    if (!open || saving) return;
    setSaving(true);
    try {
      const data = await call({ action: "decide", id: open.id, status, notes, confirmed, residence_country: residenceConfirmed ? residenceCountry : null, residence_confirmed: residenceConfirmed });
      toast.success(status === "approved" ? "Creator identity approved" : status === "flagged" ? "Submission flagged for review" : "Submission declined");
      if (status !== "flagged" && data.notification !== "sent") toast.warning("Decision saved. Email was not sent; the creator can read the result in their dashboard.");
      setOpen(null); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Decision failed"); }
    finally { setSaving(false); }
  };
  const exportPage = async () => {
    try {
      const data = await call({ action: "export", filter, offset, ...(country ? {country} : {}), query });
      const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href=url; anchor.download=`DTT-private-identity-audit-${new Date().toISOString().slice(0,10)}-page-${offset/25+1}.json`; anchor.click(); URL.revokeObjectURL(url);
    } catch(failure) { toast.error(failure instanceof Error ? failure.message : "Export failed"); }
  };
  if (access === "loading") return <p className="text-muted-foreground">Checking administrator access…</p>;
  if (access !== "admin") return <section className="space-y-3 py-6"><h2 className="font-bold">CREATOR VERIFICATIONS</h2><p className="text-muted-foreground">{access === "signed-out" ? "Sign in with your administrator account to review private identity documents. An access code alone cannot open these records." : "This account does not have administrator privileges."}</p>{access === "signed-out" && <Button asChild variant="outline"><Link to="/">ACCOUNT SIGN-IN</Link></Button>}</section>;
  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-lg">DTT AGE VERIFICATION</h2><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void exportPage()} disabled={loading || !rows.length}>EXPORT THIS PAGE</Button><Button variant="outline" onClick={load} disabled={loading}>REFRESH</Button></div></header>
    <div className="border-y border-border py-3 space-y-1"><p className="font-semibold text-sm">Human review queue</p><p className="text-sm text-muted-foreground">These submissions contain creator-provided details and private evidence, not specialist-verified results. Automatic ID, face and liveness checks are not connected. Your final review remains required.</p></div>
    <div className="flex flex-wrap gap-2">{["pending","flagged","approved","rejected","all"].map(value => <Button key={value} variant={filter === value ? "neon" : "outline"} size="sm" onClick={() => { setFilter(value); setOffset(0); }}>{value === "rejected" ? "DECLINED" : value.toUpperCase()}</Button>)}</div>
    <div className="grid gap-3 sm:grid-cols-[150px_1fr]"><label className="text-sm text-muted-foreground">Country code<Input aria-label="Country code" placeholder="All countries" value={country} maxLength={2} onChange={e => { setCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g,"")); setOffset(0); }} /></label><label className="text-sm text-muted-foreground">Name or username<Input aria-label="Name or username" value={query} maxLength={100} onChange={e => { setQuery(e.target.value); setOffset(0); }} /></label></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p className="text-muted-foreground">Loading submissions…</p> : rows.length === 0 ? <p className="text-muted-foreground py-8">No matching submissions.</p> : <div className="divide-y divide-border">{rows.map(row => { const age = identityAge(row.date_of_birth); return <article key={row.id} className="py-4 flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 space-y-1"><p className="text-xs font-bold text-gold">{row.country ?? "COUNTRY NOT RECORDED"} · {row.status.toUpperCase()}</p><h3 className="font-semibold break-words">{row.legal_first_name} {row.legal_last_name}</h3><p className="text-sm break-all text-muted-foreground">{row.display_name ?? "Username not recorded"} · {row.email}</p><p className="text-xs text-muted-foreground">DOB {row.date_of_birth} · <span className={age !== null && age >= 18 ? "text-success" : "text-destructive"}>{age === null ? "Invalid age" : `${age} years · ${age >= 18 ? "18+" : "UNDER 18"}`}</span></p><p className="text-xs text-muted-foreground">Queued {new Date(row.submitted_at).toLocaleString()}</p>{row.reviewed_at && <p className="text-xs text-muted-foreground">Reviewed {new Date(row.reviewed_at).toLocaleString()} · {row.reviewer_notes}</p>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => review(row)}>VIEW DOCUMENTS</Button>{["pending","flagged"].includes(row.status) && <Button variant="success" onClick={() => review(row)}>REVIEW</Button>}</div></article>; })}</div>}
    <footer className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0,offset-25))}>PREVIOUS</Button><p className="text-sm text-muted-foreground">{total ? `${offset+1}–${Math.min(offset+25,total)} of ${total}` : "0 records"}</p><Button variant="outline" size="sm" disabled={offset+25 >= total || loading} onClick={() => setOffset(offset+25)}>NEXT</Button></footer>
    <Dialog open={!!open} onOpenChange={value => { if (!value && !saving) setOpen(null); }}><DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{open?.legal_first_name} {open?.legal_last_name}</DialogTitle><DialogDescription>{open?.display_name} · {open?.country} · DOB {open?.date_of_birth}</DialogDescription></DialogHeader>{imageError && <p role="alert" className="text-destructive">{imageError}</p>}<p className="text-sm text-muted-foreground">Human review · {open?.document_type ?? "Legacy document"} · Issued {open?.issuing_country ?? "Not recorded"} · Expires {open?.document_expires_on ?? "Not recorded"}</p><div className="grid sm:grid-cols-2 gap-4">{open && [{label:"Government ID",path:open.id_front_path},{label:"Holding selfie with ID and note",path:open.selfie_path},...(open.id_back_path ? [{label:"Government ID back",path:open.id_back_path}] : [])].map(item => <div key={item.path} className="space-y-2"><p className="text-sm font-semibold">{item.label}</p>{urls[item.path] ? <a href={urls[item.path]} target="_blank" rel="noreferrer"><img src={urls[item.path]} alt={item.label} className="w-full max-h-96 object-contain border border-border rounded-md" /></a> : <p className="text-muted-foreground">Loading private image…</p>}</div>)}</div>{open && ["pending","flagged"].includes(open.status) && <div className="space-y-4"><label className="flex items-start gap-3 text-sm"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} /><span>I checked the government ID confirms age 18+, the legal name and face match, the front/back evidence is readable and the ID is unexpired, and the handwritten note shows Drop That Thing, the submission date and username.</span></label><div className="space-y-2"><label className="text-sm">Country of residence shown on photo ID<Input aria-label="ID residence country" maxLength={2} value={residenceCountry} onChange={e => { setResidenceCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g,"")); setResidenceConfirmed(false); }} /></label><label className="flex items-start gap-3 text-sm"><Checkbox checked={residenceConfirmed} disabled={!/^[A-Z]{2}$/.test(residenceCountry) || !open.document_expires_on || !validIdentityExpiry(open.document_expires_on)} onCheckedChange={value => setResidenceConfirmed(value === true)} /><span>I checked a current government photo ID showing the creator's actual residential address in this country. Issuing country or nationality alone is not residence evidence.</span></label><p className="text-xs text-muted-foreground">Without this confirmation, identity approval does not grant a founding slot. Keep the full address private.</p></div>{decline && <div className="space-y-2"><label className="block text-sm">Decline reason<select aria-label="Decline reason" className="w-full bg-secondary border border-border rounded-md p-2" value={REASONS.includes(notes) ? notes : ""} onChange={e => setNotes(e.target.value)}><option value="">Choose a reason or write one below</option>{REASONS.map(reason => <option key={reason}>{reason}</option>)}</select></label><textarea aria-label="Reviewer reason" className="w-full rounded-md bg-secondary border border-border p-3 text-sm" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} /></div>}<label className="block text-sm">Review notes<textarea aria-label="Review notes" className="w-full rounded-md bg-secondary border border-border p-3 text-sm" maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)} /></label><Button variant="outline" disabled={saving || !notes.trim()} onClick={()=>void decide("flagged")}>FLAG FOR FURTHER REVIEW</Button><div className="flex gap-3"><Button variant="outline" className="text-destructive border-destructive flex-1" disabled={saving || (decline && !notes.trim())} onClick={() => decline ? decide("rejected") : setDecline(true)}>{saving ? "SAVING…" : decline ? "CONFIRM DECLINE" : "DECLINE"}</Button><Button variant="success" className="flex-1" disabled={saving || !confirmed || !urls[open.id_front_path] || !urls[open.selfie_path] || (identityAge(open.date_of_birth) ?? 0) < 18 || (!!open.document_expires_on && !validIdentityExpiry(open.document_expires_on)) || (!!open.document_expires_on && !urls[open.id_back_path]) || (residenceConfirmed && !/^[A-Z]{2}$/.test(residenceCountry))} onClick={() => decide("approved")}>{saving ? "SAVING…" : "APPROVE"}</Button></div></div>}</DialogContent></Dialog>
  </section>;
}
