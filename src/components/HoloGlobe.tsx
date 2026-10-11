import { useMemo } from "react";
import * as THREE from "three";
import WORLD_BORDERS from "@/lib/worldBorders";

export const R = 1;

export const latLngToVec3 = (lat: number, lng: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
};

// Holographic sphere with real world country borders + faint graticule.
export const HoloSphere = ({ borderOpacity = 0.85 }: { borderOpacity?: number }) => {
  const { borders, grid } = useMemo(() => {
    const borderGeoms: THREE.BufferGeometry[] = [];
    for (const ring of WORLD_BORDERS) {
      const pts = ring.map(([lng, lat]) => new THREE.Vector3(...latLngToVec3(lat, lng, R * 1.001)));
      borderGeoms.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    const gridGeoms: THREE.BufferGeometry[] = [];
    const seg = 96;
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= seg; i++) {
        const lng = (i / seg) * 360 - 180;
        pts.push(new THREE.Vector3(...latLngToVec3(lat, lng, R)));
      }
      gridGeoms.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    for (let lng = -180; lng < 180; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= seg; i++) {
        const lat = (i / seg) * 180 - 90;
        pts.push(new THREE.Vector3(...latLngToVec3(lat, lng, R)));
      }
      gridGeoms.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    return { borders: borderGeoms, grid: gridGeoms };
  }, []);

  return (
    <group>
      {/* Ocean base + inner glow */}
      <mesh>
        <sphereGeometry args={[R * 0.985, 48, 48]} />
        <meshBasicMaterial color="#0a2a55" transparent opacity={0.35} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R * 0.985, 48, 48]} />
        <meshBasicMaterial color="#071d3d" transparent opacity={0.75} />
      </mesh>
      {/* Real country borders */}
      {borders.map((g, i) => (
        <primitive
          key={`b${i}`}
          object={new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#4db8ff", transparent: true, opacity: borderOpacity }))}
        />
      ))}
      {/* Faint graticule */}
      {grid.map((g, i) => (
        <primitive
          key={`g${i}`}
          object={new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#2a6db3", transparent: true, opacity: 0.12 }))}
        />
      ))}
    </group>
  );
};
