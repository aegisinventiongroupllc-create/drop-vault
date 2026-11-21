import GalaxyReel from "@/components/GalaxyReel";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

/** Lets the wallpaper exporter render exact, repeatable frames of the live globe. */
export type GlobeFrameController = { canvas: HTMLCanvasElement; renderAt: (seconds: number) => void; pause: () => void; resume: () => void };

const FrameBridge = ({ controller, onLoop }: { controller: MutableRefObject<GlobeFrameController | null>; onLoop: (loop: "always" | "never") => void }) => {
  const gl = useThree((state) => state.gl);
  const advance = useThree((state) => state.advance);
  const setFrameloop = useThree((state) => state.setFrameloop);
  useEffect(() => {
    controller.current = { canvas: gl.domElement, renderAt: (seconds) => advance(seconds, true), pause: () => { onLoop("never"); setFrameloop("never"); }, resume: () => { onLoop("always"); setFrameloop("always"); } };
    return () => { controller.current = null; };
  }, [controller, gl, advance, setFrameloop, onLoop]);
  return null;
};

const SpinningGlobe = ({ speed, lights, size, style, dotScale, glintBoost, pulse = 0, absolute = false }: { speed: number; lights: boolean; size: number; style: GlobeStyle; dotScale?: number; glintBoost?: number; pulse?: number; absolute?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) {
      // Absolute angle keeps exported loops exact: time T and T + one turn match.
      if (absolute) groupRef.current.rotation.y = clock.elapsedTime * speed;
      else groupRef.current.rotation.y += delta * speed;
      // Slow, subtle breathing: the whole globe gently swells and settles.
      if (pulse > 0) {
        const s = 1 + pulse * (0.5 - 0.5 * Math.cos(clock.getElapsedTime() * 1.25));
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
const MiniGlobe = ({ size = 22, speed = 0.6, lights = false, styleOverride, backdrop = true, dotScale, glintBoost, pulse = 0, cameraDistance = 3.2, sharp = false, exportable = false, frameController }: { frameController?: MutableRefObject<GlobeFrameController | null>; exportable?: boolean; sharp?: boolean; size?: number; speed?: number; lights?: boolean; styleOverride?: GlobeStyle; backdrop?: boolean; dotScale?: number; glintBoost?: number; pulse?: number; cameraDistance?: number }) => {
  const autoStyle = useGlobeStyle();
  const style = styleOverride ?? autoStyle;
  // Held in state so parent re-renders during export never restart the live loop.
  const [frameloop, setLoop] = useState<"always" | "never">("always");
  return (
    <span className="relative inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
      {backdrop && size >= 100 && <GalaxyReel className="rounded-full" />}
      <Canvas frameloop={frameloop} camera={{ position: [0, 0, cameraDistance], fov: 40 }} dpr={exportable ? 5 : sharp ? [1, Math.min(3, window.devicePixelRatio || 1)] : [1, 2]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: exportable }}>
        <SpinningGlobe speed={speed} lights={lights} size={size} style={style} dotScale={dotScale} glintBoost={glintBoost} pulse={pulse} absolute={!!frameController} />
        <Atmosphere />
        {frameController && <FrameBridge controller={frameController} onLoop={setLoop} />}
      </Canvas>
    </span>
  );
};

export default MiniGlobe;
