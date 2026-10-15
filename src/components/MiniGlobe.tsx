import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloSphere, latLngToVec3, R } from "@/components/HoloGlobe";
import { COUNTRY_LATLNG } from "@/components/GlobePicker";
import { isBlockedCountry } from "@/lib/restrictedCountries";

// Bright white "city lights" on every allowed country.
const CountryLights = () => {
  const points = useMemo(
    () =>
      Object.entries(COUNTRY_LATLNG)
        .filter(([code]) => !isBlockedCountry(code))
        .map(([code, [lat, lng]]) => ({ code, pos: latLngToVec3(lat, lng, R * 1.01) })),
    [],
  );
  return (
    <>
      {points.map(({ code, pos }) => (
        <group key={code} position={pos}>
          <mesh>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
};

const SpinningGlobe = ({ speed, lights }: { speed: number; lights: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) groupRef.current.rotation.y += delta * speed;
  });
  return (
    <group ref={groupRef} rotation={[0.3, 0, 0]}>
      <HoloSphere borderOpacity={0.9} />
      {lights && <CountryLights />}
    </group>
  );
};

// Small spinning blue globe; optional slow spin and white country lights.
const MiniGlobe = ({ size = 22, speed = 0.6, lights = false }: { size?: number; speed?: number; lights?: boolean }) => (
  <span className="inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
    <Canvas camera={{ position: [0, 0, 2.6], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <SpinningGlobe speed={speed} lights={lights} />
    </Canvas>
  </span>
);

export default MiniGlobe;
