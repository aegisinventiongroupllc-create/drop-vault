import GalaxyReel from "@/components/GalaxyReel";
import MiniGlobe from "@/components/MiniGlobe";
import { useEffect, useState } from "react";
import { loadTheme } from "@/lib/userTheme";
import TwinklingStars from "@/components/TwinklingStars";

/** Every member page sits on the Be Right Back sky: the default pink galaxy and globe, or the member's saved galaxy, globe and colors. */
export default function PersonalSkyBackdrop() {
  const [theme, setTheme] = useState(loadTheme);
  useEffect(() => { const update = () => setTheme(loadTheme()); window.addEventListener("dtt-theme", update); return () => window.removeEventListener("dtt-theme", update); }, []);
  return <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" data-testid="personal-dashboard-sky">
    <GalaxyReel scope="brb" seconds={240} />
    <div className="absolute inset-0 flex items-center justify-center opacity-40"><MiniGlobe size={320} speed={0.15} lights backdrop={false} cameraDistance={3.8} /></div>
    <div className="absolute inset-0 bg-background/55" />
    {theme.dashboardStars && <TwinklingStars color={theme.dashboardStarTone} />}
  </div>;
}
