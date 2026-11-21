import { useEffect, useState } from "react";
import { launchCountdown } from "@/lib/launchCountdown";

export default function IdleCountdown({ snapshot }: { snapshot?: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (snapshot !== undefined) return;
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [snapshot]);
  const time = launchCountdown(snapshot ?? now);
  return <div role="timer" aria-label="New Year countdown to midnight in New York" className="w-full max-w-xs text-center text-foreground tabular-nums">
    {time.complete ? <p className="text-2xl font-bold">2027</p> : <div className="grid grid-cols-4 gap-2">
      {([[time.days, "DAYS"], [time.hours, "HRS"], [time.minutes, "MIN"], [time.seconds, "SEC"]] as const).map(([value, label]) => <div key={label}><span className="block text-2xl font-bold">{String(value).padStart(2, "0")}</span><span className="text-[10px] font-semibold">{label}</span></div>)}
    </div>}
  </div>;
}