import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloSphere } from "@/components/HoloGlobe";
import CityLights, { Atmosphere, US_GLOW_HUBS } from "@/components/CityLights";
import { useGlobeStyle, type GlobeStyle } from "@/lib/globeStyle";
import { COUNTRY_LATLNG } from "@/components/GlobePicker";
import { isBlockedCountry } from "@/lib/restrictedCountries";

const SPECS = Object.entries(COUNTRY_LATLNG)
  .filter(([code]) => !isBlockedCountry(code))
  .map(([, [lat, lng]]) => ({ lat, lng, people: 4 }))
  .concat(US_GLOW_HUBS);

const SpinningGlobe = ({ speed, lights, size, style }: { speed: number; lights: boolean; size: number; style: GlobeStyle }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) groupRef.current.rotation.y += delta * speed;
  });
  return (
    <group ref={groupRef} rotation={[0.3, 0, 0]}>
      <HoloSphere style={style} />
      {lights && <CityLights countries={SPECS} density={0.6} scale={size / 140} />}
    </group>
  );
};

// Small spinning blue globe; optional slow spin and white country lights.
const MiniGlobe = ({ size = 22, speed = 0.6, lights = false, styleOverride }: { size?: number; speed?: number; lights?: boolean; styleOverride?: GlobeStyle }) => {
  const autoStyle = useGlobeStyle();
  const style = styleOverride ?? autoStyle;
  return (
    <span className="inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <SpinningGlobe speed={speed} lights={lights} size={size} style={style} />
        <Atmosphere />
      </Canvas>
    </span>
  );
};

export default MiniGlobe;
