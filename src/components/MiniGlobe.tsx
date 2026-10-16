import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloSphere } from "@/components/HoloGlobe";
import CityLights, { Atmosphere } from "@/components/CityLights";
import { COUNTRY_LATLNG } from "@/components/GlobePicker";
import { isBlockedCountry } from "@/lib/restrictedCountries";

const SPECS = Object.entries(COUNTRY_LATLNG)
  .filter(([code]) => !isBlockedCountry(code))
  .map(([, [lat, lng]]) => ({ lat, lng, people: 4 }));

const SpinningGlobe = ({ speed, lights, size }: { speed: number; lights: boolean; size: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) groupRef.current.rotation.y += delta * speed;
  });
  return (
    <group ref={groupRef} rotation={[0.3, 0, 0]}>
      <HoloSphere borderOpacity={0.4} />
      {lights && <CityLights countries={SPECS} density={0.6} scale={size / 140} />}
    </group>
  );
};

// Small spinning blue globe; optional slow spin and white country lights.
const MiniGlobe = ({ size = 22, speed = 0.6, lights = false }: { size?: number; speed?: number; lights?: boolean }) => (
  <span className="inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
    <Canvas camera={{ position: [0, 0, 2.6], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <SpinningGlobe speed={speed} lights={lights} size={size} />
      <Atmosphere />
    </Canvas>
  </span>
);

export default MiniGlobe;
