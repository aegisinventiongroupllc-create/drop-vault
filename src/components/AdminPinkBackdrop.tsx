import GalaxyReel from "@/components/GalaxyReel";
import EntryPassGlobe, { ENTRY_GLOBE } from "@/components/EntryPassGlobe";

/** Default DTT pink galaxy + pink globe for admin creator/customer previews; never reads personal themes. */
export default function AdminPinkBackdrop() {
  return <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" data-testid="admin-pink-backdrop">
    <GalaxyReel scope="brb" seconds={240} styleOverride="cluster" toneOverride={ENTRY_GLOBE.tone} />
    <div className="absolute inset-0 flex items-center justify-center opacity-40"><EntryPassGlobe size={320} /></div>
    <div className="absolute inset-0 bg-background/55" />
  </div>;
}
