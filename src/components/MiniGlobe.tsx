import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloSphere } from "@/components/HoloGlobe";

const SpinningGlobe = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={groupRef} rotation={[0.3, 0, 0]}>
      <HoloSphere borderOpacity={0.9} />
    </group>
  );
};

// Small spinning blue globe used as the country-picker button icon.
const MiniGlobe = ({ size = 22 }: { size?: number }) => (
  <span className="inline-block shrink-0 pointer-events-none" style={{ width: size, height: size }} aria-hidden>
    <Canvas camera={{ position: [0, 0, 2.6], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <SpinningGlobe />
    </Canvas>
  </span>
);

export default MiniGlobe;
