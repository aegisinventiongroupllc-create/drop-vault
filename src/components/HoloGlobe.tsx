import { useMemo } from "react";
import * as THREE from "three";
import WORLD_BORDERS from "@/lib/worldBorders";
import type { GlobeStyle } from "@/lib/globeStyle";

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

/**
 * The DTT globe surface.
 *  - "brand": dark navy sphere, cyan country borders, faint grid — straight to the point.
 *  - "earth": satellite day map with city lights glowing on the night side.
 * Both keep the same size and position, so switching is only a change of skin.
 */
export const HoloSphere = ({ style = "brand" }: { style?: GlobeStyle }) => {
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

  const earthMaterial = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const day = loader.load("/textures/earth_atmos_2048.jpg");
    const night = loader.load("/textures/earth_lights_2048.png");
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = night.anisotropy = 4;
    return new THREE.ShaderMaterial({
      uniforms: { dayMap: { value: day }, nightMap: { value: night } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vView;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D dayMap; uniform sampler2D nightMap;
        varying vec2 vUv; varying vec3 vN; varying vec3 vView;
        void main(){
          vec3 day = texture2D(dayMap, vUv).rgb;
          vec3 lights = texture2D(nightMap, vUv).rgb;
          // Sun from the upper-left so one limb glows like orbit photos.
          vec3 sun = normalize(vec3(-0.8, 0.45, 0.4));
          float lit = smoothstep(-0.15, 0.6, dot(vN, sun));
          vec3 col = day * (0.12 + 0.9 * lit);
          float dark = 1.0 - lit;
          col += lights * vec3(1.6, 1.05, 0.55) * (0.55 + 1.2 * dark);
          float fres = pow(1.0 - max(dot(vN, vView), 0.0), 3.0);
          col += vec3(0.25, 0.55, 1.0) * fres * 0.9;
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
  }, []);

  if (style === "earth") {
    return (
      <group>
        {/* Photo-real Earth: satellite day map + city-lights night map */}
        <mesh material={earthMaterial}>
          <sphereGeometry args={[R * 0.995, 96, 96]} />
        </mesh>
      </group>
    );
  }

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
          object={new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#4db8ff", transparent: true, opacity: 0.8 }))}
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
