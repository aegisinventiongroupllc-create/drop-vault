import GalaxyReel from "@/components/GalaxyReel";
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloSphere } from "@/components/HoloGlobe";
import CityLights, { Atmosphere, ShootingStars, US_GLOW_HUBS, WORLD_GLOW_HUBS } from "@/components/CityLights";
import { useGlobeStyle, type GlobeStyle } from "@/lib/globeStyle";
import { COUNTRY_LATLNG } from "@/components/GlobePicker";
import { isBlockedCountry } from "@/lib/restrictedCountries";

const SPECS = Object.entries(COUNTRY_LATLNG)
  .filter(([code]) => !isBlockedCountry(code))
  .map(([, [lat, lng]]) => ({ lat, lng, people: 4 }))
  .concat(US_GLOW_HUBS).concat(WORLD_GLOW_HUBS);

const SpinningGlobe = ({ speed, lights, size, style, dotScale, glintBoost, pulse = 0 }: { speed: number; lights: boolean; size: number; style: GlobeStyle; dotScale?: number; glintBoost?: number; pulse?: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * speed;
      // Slow, subtle breathing: the whole globe gently swells and settles.
      if (pulse > 0) {
        const s = 1 + pulse * (0.5 - 0.5 * Math.cos(clock.getElapsedTime() * 0.8));
        groupRef.current.scale.setScalar(s);
      }
    }
  });
  return (
    <group ref={groupRef} rotation={[0.3, 0, 0]}>
      <HoloSphere style={style} />
      {lights && <CityLights countries={SPECS} density={0.6} scale={size / 140} dotScale={dotScale} glintBoost={glintBoost} />}
      {lights && <ShootingStars />}
    </group>
  );
};

// Small spinning blue globe; optional slow spin and white country lights.
const MiniGlobe = ({ size = 22, speed = 0.6, lights = false, styleOverride, backdrop = true, dotScale, glintBoost, pulse = 0 }: { size?: number; speed?: number; lights?: boolean; styleOverride?: GlobeStyle; backdrop?: boolean; dotScale?: number; glintBoost?: number; pulse?: number }) => {
  const autoStyle = useGlobeStyle();
  const style = styleOverride ?? autoStyle;
  return (
    <span className="relative inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
      {backdrop && size >= 100 && <GalaxyReel className="rounded-full" />}
      <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <SpinningGlobe speed={speed} lights={lights} size={size} style={style} dotScale={dotScale} glintBoost={glintBoost} pulse={pulse} />
        <Atmosphere />
      </Canvas>
    </span>
  );
};

export default MiniGlobe;
