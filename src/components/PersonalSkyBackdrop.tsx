import GalaxyReel from "@/components/GalaxyReel";
import { usePersonalGlobe } from "@/lib/userTheme";

export default function PersonalSkyBackdrop() {
  const { dashboardSky } = usePersonalGlobe();
  if (!dashboardSky) return null;
  return <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" data-testid="personal-dashboard-sky">
    <GalaxyReel scope="brb" />
    <div className="absolute inset-0 bg-background/70" />
  </div>;
}
