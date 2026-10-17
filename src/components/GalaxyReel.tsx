import reel from "@/assets/brb/galaxy-reel.jpg";
import { usePersonalGlobe } from "@/lib/userTheme";
import { cn } from "@/lib/utils";

/**
 * Shared realistic galaxy backdrop that pans slowly left-to-right on repeat.
 * Frames alternate normal/mirrored so the loop has no visible seam.
 * Tinted with the viewer's chosen galaxy color when they picked one.
 */
const GalaxyReel = ({ className, seconds = 120 }: { className?: string; seconds?: number }) => {
  const { galaxyTone } = usePersonalGlobe();
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-background", className)} aria-hidden>
      <div className="galaxy-reel-track absolute inset-y-0 left-0 flex h-full" style={{ animationDuration: `${seconds}s` }}>
        {[0, 1, 2, 3].map((i) => (
          <img key={i} src={reel} alt="" className="h-full w-auto max-w-none object-cover" style={i % 2 ? { transform: "scaleX(-1)" } : undefined} />
        ))}
      </div>
      {galaxyTone && <div className="absolute inset-0 mix-blend-color opacity-70" style={{ backgroundColor: galaxyTone }} />}
    </div>
  );
};

export default GalaxyReel;
