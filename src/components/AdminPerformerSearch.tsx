import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = {
  performer_record_id: string; content_record_id: string; legal_name: string; date_of_birth: string;
  stage_aliases: string[]; performer_kind: string; storage_path: string; recorded_on: string;
};

const AdminPerformerSearch = () => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setMsg("");
    const { data, error } = await supabase.rpc("search_performer_index", { _query: q, _offset: 0 });
    setBusy(false);
    if (error) { setRows([]); setMsg("Search unavailable. Sign in as an administrator."); return; }
    setRows((data ?? []) as Row[]);
    if (!data?.length) setMsg("No permanent performer records match.");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">§ 2257 PERFORMER SEARCH</h3>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Legal name, stage alias or record ID" maxLength={100} />
        <Button type="submit" disabled={busy || q.trim().length < 2}>SEARCH</Button>
      </form>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.performer_record_id + r.content_record_id + r.storage_path} className="rounded border border-border p-2 text-xs space-y-0.5">
            <p className="font-semibold text-foreground">{r.legal_name} · DOB {r.date_of_birth} · {r.performer_kind}</p>
            <p className="text-muted-foreground">Aliases: {r.stage_aliases.join(", ") || "—"}</p>
            <p className="text-muted-foreground">Performer {r.performer_record_id} · Content {r.content_record_id} · Recorded {r.recorded_on}</p>
            <p className="text-muted-foreground/70 break-all">{r.storage_path}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPerformerSearch;
