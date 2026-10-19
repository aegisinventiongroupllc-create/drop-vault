import { useState, type ReactNode } from "react";

/** A titled box with a top-right HIDE/SHOW toggle to save room on the page. */
export default function FoldBox({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground">{title}</span>
        <button type="button" aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} ${title}`} onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}
