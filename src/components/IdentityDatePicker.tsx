import { useEffect, useState } from "react";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const selectClass = "h-12 w-full rounded-md border border-border bg-secondary px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

/** Simple Month / Day / Year dropdowns — easy to read and tap on phones. */
export default function IdentityDatePicker({ value, onChange, label = "Date of birth", mode = "birth" }: { value: string; onChange: (v: string) => void; label?: string; mode?: "birth" | "expiry" }) {
  const [y0, m0, d0] = value ? value.split("-") : ["", "", ""];
  const [year, setYear] = useState(y0); const [month, setMonth] = useState(m0); const [day, setDay] = useState(d0);
  useEffect(() => { const [y, m, d] = value ? value.split("-") : ["", "", ""]; setYear(y); setMonth(m); setDay(d); }, [value]);
  const now = new Date().getFullYear();
  const years = mode === "birth" ? Array.from({ length: 100 }, (_, i) => now - 18 - i) : Array.from({ length: 31 }, (_, i) => now - 10 + i).reverse();
  const daysInMonth = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  const update = (y: string, m: string, d: string) => {
    setYear(y); setMonth(m); setDay(d);
    const max = y && m ? new Date(Number(y), Number(m), 0).getDate() : 31;
    onChange(y && m && d && Number(d) <= max ? `${y}-${m}-${d}` : "");
  };
  return <div className="grid grid-cols-[1.4fr_1fr_1.2fr] gap-2" role="group" aria-label={label}>
    <select aria-label={`${label} month`} className={selectClass} value={month} onChange={e => update(year, e.target.value, day)}><option value="">Month</option>{MONTHS.map((name, i) => <option key={name} value={String(i + 1).padStart(2, "0")}>{name}</option>)}</select>
    <select aria-label={`${label} day`} className={selectClass} value={day} onChange={e => update(year, month, e.target.value)}><option value="">Day</option>{Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0")).map(d => <option key={d} value={d}>{Number(d)}</option>)}</select>
    <select aria-label={`${label} year`} className={selectClass} value={year} onChange={e => update(e.target.value, month, day)}><option value="">Year</option>{years.map(y => <option key={y} value={String(y)}>{y}</option>)}</select>
  </div>;
}
