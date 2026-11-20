import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import EntryPassGlobe, { ENTRY_GLOBE } from "@/components/EntryPassGlobe";
import GalaxyReel from "@/components/GalaxyReel";
import { launchCountdown } from "@/lib/launchCountdown";
import "./creator-launch.css";

export default function CreatorLaunchCountdown({ compact = false, audience = "creator" }: { compact?: boolean; audience?: "creator" | "customer" }) {
  const [time, setTime] = useState(() => launchCountdown());
  const reduced = useReducedMotion();
  useEffect(() => {
    const update = () => setTime(launchCountdown());
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  return <section className={`creator-launch ${compact ? "creator-launch-compact" : ""} relative isolate overflow-hidden py-6 text-center`} aria-label="New Year launch countdown">
    {time.complete && <div className="launch-galaxy absolute inset-0 -z-10" aria-hidden="true"><GalaxyReel scope="brb" styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} seconds={240} /></div>}
    <p className="mb-2 text-xs font-semibold text-gold">{time.complete ? "2027" : "NEW YEAR’S LAUNCH · NEW YORK MIDNIGHT"}</p>
    <div className={time.complete ? "launch-globe launch-globe-celebrate" : "launch-globe"}>
      <EntryPassGlobe size={compact ? 80 : 160} solid sharp motionless={Boolean(reduced)} />
    </div>
    {(!compact || time.complete) && <h2 className="my-3 font-display text-lg font-bold text-primary" role={time.complete ? "status" : undefined}>{time.complete ? "HAPPY NEW YEAR!" : "DTT™ LAUNCH COUNTDOWN"}</h2>}
    {!time.complete && <div role="timer" aria-label="Time until January 1, 2027 at midnight in New York" className="mx-auto grid w-full max-w-xs grid-cols-4 gap-2 px-3 tabular-nums">
      {([[time.days, "DAYS"], [time.hours, "HOURS"], [time.minutes, "MINUTES"], [time.seconds, "SECONDS"]] as const).map(([value, label]) => <div key={label}><span className="block text-2xl font-bold text-foreground">{String(value).padStart(2, "0")}</span><span className="text-[10px] text-muted-foreground">{label}</span></div>)}
    </div>}
    <p className="mx-auto mt-3 max-w-sm px-4 text-xs text-muted-foreground">{audience === "customer" ? "Launching January 1, 2027. Customer payments remain closed until launch and payment readiness are confirmed." : "Launching January 1, 2027. Private creator setup is open; paid launch requires payment approval and working payouts."}</p>
  </section>;
}