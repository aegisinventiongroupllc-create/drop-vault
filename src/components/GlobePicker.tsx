import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { COUNTRIES } from "@/components/GlobalPassport";
import { supabase } from "@/integrations/supabase/client";
import { countryName } from "@/lib/siteTranslate";
import { HoloSphere, latLngToVec3, R } from "@/components/HoloGlobe";
import { isBlockedCountry } from "@/lib/restrictedCountries";

// Only countries where this type of site is allowed appear on the globe.
const ALLOWED_COUNTRIES = COUNTRIES.filter((c) => c.code === "GLOBAL" || !isBlockedCountry(c.code));

interface GlobePickerProps {
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  /** View-only mode: highlight one creator's country. Exact location is never shown. */
  focusCountry?: string;
  focusName?: string;
}

// Approximate capital-city coordinates for each selectable country.
const COUNTRY_LATLNG: Record<string, [number, number]> = {
  US: [38.9, -77.0],
  GB: [51.5, -0.1],
  CA: [45.4, -75.7],
  AU: [-35.3, 149.1],
  BR: [-15.8, -47.9],
  MX: [19.4, -99.1],
  DE: [52.5, 13.4],
  FR: [48.9, 2.4],
  ES: [40.4, -3.7],
  IT: [41.9, 12.5],
  JP: [35.7, 139.7],
  KR: [37.6, 127.0],
  IN: [28.6, 77.2],
  CO: [4.7, -74.1],
  AR: [-34.6, -58.4],
  PH: [14.6, 121.0],
  ZA: [-25.7, 28.2],
  NG: [9.1, 7.5],
  PT: [38.7, -9.1],
};

interface MarkerProps {
  code: string;
  count: number;
  maxCount: number;
  selected: boolean;
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
}

// Small shimmering bright white light per country; brightness reflects creator count.
const CountryMarker = ({ code, count, maxCount, selected, onSelect, onHover }: MarkerProps) => {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const pos = latLngToVec3(...(COUNTRY_LATLNG[code] ?? [0, 0]), R * 1.01);
  const intensity = maxCount > 0 ? count / maxCount : 0;
  const size = 0.016 + intensity * 0.026;
  const hasCreators = count > 0;
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 2.6 + phase;
    const shimmer = Math.max(0.12, 0.55 + Math.sin(t) * 0.3 + Math.sin(t * 2.7) * 0.15);
    if (ref.current) ref.current.scale.setScalar((selected ? 1.7 : 1) * (0.92 + shimmer * 0.18));
    if (glowRef.current) glowRef.current.scale.setScalar((selected ? 2.6 : hasCreators ? 1.7 + intensity * 0.9 : 1.15) * (0.85 + shimmer * 0.35));
    if (glowMat.current) glowMat.current.opacity = (selected ? 0.9 : hasCreators ? 0.5 + intensity * 0.3 : 0.16) * shimmer;
  });

  return (
    <group position={pos}>
      {/* Bright white light core */}
      <mesh
        ref={ref}
        onClick={(e) => { e.stopPropagation(); onSelect(code); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(code); }}
        onPointerOut={() => { document.body.style.cursor = "auto"; onHover(null); }}
      >
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Shimmering halo */}
      <mesh
        ref={glowRef}
        onClick={(e) => { e.stopPropagation(); onSelect(code); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; onHover(code); }}
        onPointerOut={() => { document.body.style.cursor = "auto"; onHover(null); }}
      >
        <sphereGeometry args={[size * 2.4, 16, 16]} />
        <meshBasicMaterial ref={glowMat} color="#ffffff" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
};

interface GlobeSceneProps {
  counts: Record<string, number>;
  selected: string;
  onSelect: (code: string) => void;
  onHover: (code: string | null) => void;
}

const GlobeScene = ({ counts, selected, onSelect, onHover }: GlobeSceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const maxCount = Math.max(1, ...Object.values(counts));

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.15;
  });

  return (
    <>
      <group ref={groupRef}>
        <HoloSphere />
        {Object.keys(COUNTRY_LATLNG).filter((code) => !isBlockedCountry(code)).map((code) => (
          <CountryMarker
            key={code}
            code={code}
            count={counts[code] ?? 0}
            maxCount={maxCount}
            selected={selected === code}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </group>
      <OrbitControls enableZoom enablePan={false} rotateSpeed={0.5} minDistance={1.6} maxDistance={4.5} zoomSpeed={0.7} />
    </>
  );
};

const GlobePicker = ({ selected, onSelect, onClose, focusCountry, focusName }: GlobePickerProps) => {
  const [query, setQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  const viewOnly = !!focusCountry;
  const effectiveSelected = focusCountry ?? selected;

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("country")
        .eq("role", "creator")
        .limit(10000);
      if (!alive || !data) return;
      const next: Record<string, number> = {};
      for (const row of data) {
        const c = (row as { country?: string | null }).country;
        if (c) next[c] = (next[c] ?? 0) + 1;
      }
      setCounts(next);
    };
    load();
    // Live refresh: new creators light up without reopening the globe.
    const timer = window.setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALLOWED_COUNTRIES;
    return ALLOWED_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || countryName(c.code, c.name).toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [query]);

  const current = ALLOWED_COUNTRIES.find((c) => c.code === selected) ?? ALLOWED_COUNTRIES[0];
  const totalCreators = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with search bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground active:scale-95 transition-all" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries... Mexico, Japan, Brazil..."
            className="w-full bg-secondary rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* 3D holographic globe */}
      <div className="relative h-[42vh] min-h-[260px] select-none">
        <Canvas camera={{ position: [0, 0.4, 2.6], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
          <GlobeScene counts={counts} selected={selected} onSelect={(code) => { onSelect(code); onClose(); }} onHover={setHovered} />
        </Canvas>
        {/* Country + creator count readout for the light being touched */}
        {hovered && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-card/90 border border-primary/40 backdrop-blur-sm pointer-events-none">
            <span className="text-[11px] font-bold tracking-wider text-foreground">
              {ALLOWED_COUNTRIES.find((c) => c.code === hovered)?.flag}{" "}
              {hovered ? countryName(hovered, ALLOWED_COUNTRIES.find((c) => c.code === hovered)?.name ?? hovered).toUpperCase() : ""}
            </span>
            <span className="ml-2 text-[11px] font-bold tracking-wider text-primary">
              {counts[hovered] ?? 0} CREATOR{(counts[hovered] ?? 0) === 1 ? "" : "S"}
            </span>
          </div>
        )}
        <p className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold tracking-widest text-muted-foreground pointer-events-none">
          DRAG TO SPIN · PINCH OR SCROLL TO ZOOM · TAP A LIGHT
        </p>
      </div>

      <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground pb-2">
        {totalCreators} CREATOR{totalCreators === 1 ? "" : "S"} WORLDWIDE
        {current.code !== "GLOBAL" && (
          <span className="text-primary"> · NOW: {current.flag} {countryName(current.code, current.name).toUpperCase()} ({counts[current.code] ?? 0})</span>
        )}
      </p>

      {/* Country list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1">
        {results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No country matches "{query}".</p>
        )}
        {results.map((country) => {
          const n = country.code === "GLOBAL" ? totalCreators : counts[country.code] ?? 0;
          return (
            <button
              key={country.code}
              onClick={() => { onSelect(country.code); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                selected === country.code
                  ? "bg-primary/15 border border-primary/50 text-primary"
                  : "bg-card border border-border text-foreground hover:border-primary/40"
              }`}
            >
              <span className="text-xl">{country.flag}</span>
              <span className="font-semibold text-sm flex-1">{countryName(country.code, country.name)}</span>
              <span className={`text-[10px] font-bold tracking-wider ${n > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {country.code === "GLOBAL" ? "EVERYWHERE" : n > 0 ? `${n} CREATOR${n === 1 ? "" : "S"}` : "NONE YET"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GlobePicker;
