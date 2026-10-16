import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVec3, R } from "@/components/HoloGlobe";

/**
 * Night-Earth city lights: thousands of tiny warm points per country that
 * pulse and shimmer independently. More people in a country = more lights.
 * Rendered as one point cloud so it stays fast on phones.
 */
export interface CountryLightSpec { lat: number; lng: number; people: number }

const rand = (seed: number) => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};

const vert = `
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  varying float vGlow;
  void main() {
    float tw = 0.55 + 0.3 * sin(uTime * 2.2 + aPhase) + 0.15 * sin(uTime * 5.3 + aPhase * 1.7);
    vGlow = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Fade lights on the far side of the globe.
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 wn = normalize(mat3(modelMatrix) * position);
    vGlow *= smoothstep(0.0, 0.3, dot(wn, normalize(cameraPosition - wp)));
    gl_PointSize = aSize * uScale * (0.75 + tw * 0.5) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = `
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.86, 0.55), core * core * core);
    gl_FragColor = vec4(col, core * core * vGlow * 0.85);
  }
`;

const CityLights = ({ countries, density = 1, scale = 1 }: { countries: CountryLightSpec[]; density?: number; scale?: number }) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((st) => st.viewport.dpr);
  const geom = useMemo(() => {
    const pos: number[] = [], phase: number[] = [], size: number[] = [];
    countries.forEach((c, ci) => {
      const r = rand(ci * 7919 + 17);
      // Every country glows a little; each person adds more lights (capped).
      const n = Math.round((60 + Math.min(900, Math.sqrt(c.people) * 60)) * density);
      const spread = 5 + Math.min(5, Math.log2(1 + c.people));
      // A few "city" hubs per country so lights cluster like real cities.
      const hubs = Array.from({ length: 4 }, () => [c.lat + (r() - 0.5) * spread * 1.4, c.lng + (r() - 0.5) * spread * 1.8]);
      for (let i = 0; i < n; i++) {
        const h = hubs[i % hubs.length];
        const g = () => (r() + r() + r() - 1.5) * spread * 0.55;
        const [x, y, z] = latLngToVec3(h[0] + g(), h[1] + g(), R * 1.004);
        pos.push(x, y, z);
        phase.push(r() * Math.PI * 2);
        size.push(i % 11 === 0 ? 14 : 4 + r() * 5);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(size, 1));
    return g;
  }, [countries, density]);

  useFrame(({ clock }) => { if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime; });

  return (
    <points geometry={geom} renderOrder={10}>
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={{ uTime: { value: 0 }, uScale: { value: 1.6 * scale * dpr } }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/** Soft blue atmosphere rim, like Earth seen from orbit. */
export const Atmosphere = () => (
  <mesh scale={1.12}>
    <sphereGeometry args={[R, 48, 48]} />
    <shaderMaterial
      transparent
      depthWrite={false}
      side={THREE.BackSide}
      blending={THREE.AdditiveBlending}
      vertexShader={`varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
      fragmentShader={`varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0,0,1.0)), 3.0); gl_FragColor = vec4(0.3,0.65,1.0,1.0)*i*1.6; }`}
    />
  </mesh>
);

export default CityLights;
