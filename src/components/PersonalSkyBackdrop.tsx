import GalaxyReel from "@/components/GalaxyReel";
import { usePersonalGlobe } from "@/lib/userTheme";
import { useEffect, useState } from "react";
import { loadTheme } from "@/lib/userTheme";
import TwinklingStars from "@/components/TwinklingStars";

export default function PersonalSkyBackdrop() {
  const { dashboardSky } = usePersonalGlobe();
  const [theme, setTheme] = useState(loadTheme);
  useEffect(() => { const update = () => setTheme(loadTheme()); window.addEventListener("dtt-theme", update); return () => window.removeEventListener("dtt-theme", update); }, []);
  if (!dashboardSky && !theme.dashboardStars) return null;
  return <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" data-testid="personal-dashboard-sky">
    {dashboardSky && <><GalaxyReel scope="brb" /><div className="absolute inset-0 bg-background/70" /></>}
    {theme.dashboardStars && <TwinklingStars color={theme.dashboardStarTone} />}
  </div>;
}
