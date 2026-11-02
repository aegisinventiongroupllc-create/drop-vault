import MiniGlobe from "@/components/MiniGlobe";
import { GlobeOverrideContext, type GlobeOverride } from "@/lib/userTheme";

export const ENTRY_GLOBE: GlobeOverride = {
  tone: "#ff4da6",
  borderTone: "#d6337f",
  whiteLights: true,
};

/** The entry-pass artwork, reused without changing anyone's saved theme. */
export default function EntryPassGlobe({ size = 128, solid = false }: { size?: number; solid?: boolean }) {
  return (
    <div className="relative inline-flex shrink-0 select-none" data-testid="entry-pass-globe">
      <div className={solid ? "globe-breathe" : "opacity-90 globe-breathe"}>
        <GlobeOverrideContext.Provider value={ENTRY_GLOBE}>
          <MiniGlobe size={size} speed={0.15} lights backdrop={false} cameraDistance={solid ? 3.8 : 3.2} />
        </GlobeOverrideContext.Provider>
      </div>
      <p className="absolute inset-0 flex items-center justify-center font-display text-3xl font-bold tracking-[0.35em] text-primary">DTT</p>
    </div>
  );
}