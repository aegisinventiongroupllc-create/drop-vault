import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

export default function IdentityDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  return <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start" aria-label="Date of birth">{selected ? format(selected, "PPP") : "Select date of birth"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 pointer-events-auto"><Calendar mode="single" selected={selected} defaultMonth={selected ?? new Date(2000, 0, 1)} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 120} toYear={new Date().getFullYear()} disabled={{ after: new Date() }} onSelect={date => onChange(date ? format(date, "yyyy-MM-dd") : "")} /></PopoverContent></Popover>;
}