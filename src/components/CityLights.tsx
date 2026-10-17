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

/**
 * Always-on glow hubs scattered across the United States so the globe feels
 * alive with creators everywhere, even before real counts roll in.
 */
export const US_GLOW_HUBS: CountryLightSpec[] = [
  { lat: 40.7, lng: -74.0, people: 55 },   // New York
  { lat: 34.0, lng: -118.2, people: 55 },  // Los Angeles
  { lat: 41.9, lng: -87.6, people: 26 },   // Chicago
  { lat: 29.8, lng: -95.4, people: 26 },   // Houston
  { lat: 33.7, lng: -84.4, people: 32 },   // Atlanta
  { lat: 25.8, lng: -80.2, people: 32 },   // Miami
  { lat: 32.8, lng: -96.8, people: 32 },   // Dallas
  { lat: 47.6, lng: -122.3, people: 26 },  // Seattle
  { lat: 39.7, lng: -104.9, people: 26 },  // Denver
  { lat: 36.2, lng: -115.1, people: 26 },  // Las Vegas
  { lat: 42.4, lng: -71.1, people: 26 },   // Boston
  { lat: 37.8, lng: -122.4, people: 32 },  // San Francisco
  { lat: 39.9, lng: -75.2, people: 26 },   // Philadelphia
  { lat: 33.4, lng: -112.1, people: 26 },  // Phoenix
  { lat: 44.9, lng: -93.3, people: 22 },   // Minneapolis
  { lat: 30.3, lng: -97.7, people: 26 },   // Austin
  { lat: 38.9, lng: -77.0, people: 30 },   // Washington DC
  { lat: 45.5, lng: -122.7, people: 22 },  // Portland
  { lat: 36.2, lng: -86.8, people: 22 },   // Nashville
  { lat: 35.2, lng: -80.8, people: 22 },   // Charlotte
];

/**
 * Always-on glow hubs in every approved country so the whole world sparkles
 * with creators, not just the US. Coordinates sit on land (major cities).
 */
export const WORLD_GLOW_HUBS: CountryLightSpec[] = [
  { lat: 51.5, lng: -0.12, people: 45 },   // London, GB
  { lat: 53.5, lng: -2.2, people: 25 },    // Manchester, GB
  { lat: 43.7, lng: -79.4, people: 40 },   // Toronto, CA
  { lat: 49.3, lng: -123.1, people: 28 },  // Vancouver, CA
  { lat: 45.5, lng: -73.6, people: 25 },   // Montreal, CA
  { lat: -33.9, lng: 151.2, people: 40 },  // Sydney, AU
  { lat: -37.8, lng: 144.9, people: 32 },  // Melbourne, AU
  { lat: -27.5, lng: 153.0, people: 22 },  // Brisbane, AU
  { lat: -23.6, lng: -46.6, people: 45 },  // São Paulo, BR
  { lat: -22.9, lng: -43.2, people: 35 },  // Rio de Janeiro, BR
  { lat: 19.4, lng: -99.1, people: 45 },   // Mexico City, MX
  { lat: 20.7, lng: -103.3, people: 25 },  // Guadalajara, MX
  { lat: 52.5, lng: 13.4, people: 40 },    // Berlin, DE
  { lat: 48.1, lng: 11.6, people: 28 },    // Munich, DE
  { lat: 50.1, lng: 8.7, people: 25 },     // Frankfurt, DE
  { lat: 48.9, lng: 2.4, people: 45 },     // Paris, FR
  { lat: 43.3, lng: 5.4, people: 22 },     // Marseille, FR
  { lat: 40.4, lng: -3.7, people: 40 },    // Madrid, ES
  { lat: 41.4, lng: 2.2, people: 32 },     // Barcelona, ES
  { lat: 41.9, lng: 12.5, people: 38 },    // Rome, IT
  { lat: 45.5, lng: 9.2, people: 30 },     // Milan, IT
  { lat: 35.7, lng: 139.7, people: 50 },   // Tokyo, JP
  { lat: 34.7, lng: 135.5, people: 32 },   // Osaka, JP
  { lat: 37.6, lng: 127.0, people: 45 },   // Seoul, KR
  { lat: 35.2, lng: 129.1, people: 25 },   // Busan, KR
  { lat: 28.6, lng: 77.2, people: 50 },    // Delhi, IN
  { lat: 19.1, lng: 72.9, people: 50 },    // Mumbai, IN
  { lat: 12.97, lng: 77.6, people: 35 },   // Bengaluru, IN
  { lat: 4.7, lng: -74.1, people: 38 },    // Bogotá, CO
  { lat: 6.25, lng: -75.6, people: 28 },   // Medellín, CO
  { lat: -34.6, lng: -58.4, people: 42 },  // Buenos Aires, AR
  { lat: 14.6, lng: 121.0, people: 45 },   // Manila, PH
  { lat: 10.3, lng: 123.9, people: 25 },   // Cebu, PH
  { lat: -26.2, lng: 28.0, people: 38 },   // Johannesburg, ZA
  { lat: -33.9, lng: 18.4, people: 28 },   // Cape Town, ZA
  { lat: 6.5, lng: 3.4, people: 42 },      // Lagos, NG
  { lat: 9.1, lng: 7.5, people: 28 },      // Abuja, NG
  { lat: 38.7, lng: -9.1, people: 32 },    // Lisbon, PT
  { lat: 41.2, lng: -8.6, people: 22 },    // Porto, PT
];

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
  varying float vFlash;
  void main() {
    // Slow swell: each dot builds brighter and brighter.
    float s = 0.5 + 0.5 * sin(uTime * 0.9 + aPhase);
    float tw = 0.4 + 0.6 * s * s * s;
    // Diamond glint: a sharp, brief flash with star rays.
    float f = pow(0.5 + 0.5 * sin(uTime * 1.3 + aPhase * 3.7), 28.0);
    vFlash = f;
    vGlow = tw;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 wn = normalize(mat3(modelMatrix) * position);
    vGlow *= smoothstep(0.0, 0.3, dot(wn, normalize(cameraPosition - wp)));
    gl_PointSize = aSize * uScale * (1.0 + tw * 0.5 + f * 2.2) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = `
  varying float vGlow;
  varying float vFlash;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    float core = smoothstep(0.12, 0.0, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.18;
    // Four-point diamond sparkle rays + faint diagonals.
    vec2 q = abs(p);
    float rays = exp(-q.x * 70.0) * exp(-q.y * 5.0) + exp(-q.y * 70.0) * exp(-q.x * 5.0);
    vec2 r2 = abs(vec2(p.x + p.y, p.x - p.y)) * 0.7071;
    float diag = (exp(-r2.x * 90.0) * exp(-r2.y * 9.0) + exp(-r2.y * 90.0) * exp(-r2.x * 9.0)) * 0.45;
    float spark = (rays + diag) * (0.25 + vFlash * 1.6);
    vec3 col = mix(vec3(1.0, 0.85, 0.55), vec3(0.95, 0.98, 1.0), clamp(core + vFlash, 0.0, 1.0));
    gl_FragColor = vec4(col, (core + halo + spark) * vGlow);
  }
`;

const CityLights = ({ countries, density = 1, scale = 1 }: { countries: CountryLightSpec[]; density?: number; scale?: number }) => {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const dpr = useThree((st) => st.viewport.dpr);
  const geom = useMemo(() => {
    const pos: number[] = [], phase: number[] = [], size: number[] = [];
    countries.forEach((c, ci) => {
      const r = rand(ci * 7919 + 17);
      // Separate crisp dots per spot — more of them, still never a blob.
      const n = Math.max(2, Math.round((3 + Math.min(9, Math.sqrt(c.people) * 1.2)) * density));
      for (let i = 0; i < n; i++) {
        const [x, y, z] = latLngToVec3(c.lat + (r() - 0.5) * 3.2, c.lng + (r() - 0.5) * 4.0, R * 1.004);
        pos.push(x, y, z);
        phase.push(r() * Math.PI * 2);
        size.push(7 + r() * 4);
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
        uniforms={{ uTime: { value: 0 }, uScale: { value: 1.3 * scale * dpr } }}
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

/**
 * A glowing shooting star every `intervalSec` seconds (default 15 minutes):
 * blazing white-gold head with a long, tapering sparkle trail.
 */
const TRAIL = 70;
const starVert = `
  attribute float aFade;
  uniform float uScale;
  varying float vA;
  void main() {
    vA = aFade;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uScale * (2.0 + 26.0 * aFade * aFade) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const starFrag = `
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.2, 0.0, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.5;
    vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(1.0, 0.97, 0.85), vA);
    gl_FragColor = vec4(col, (core + halo) * vA);
  }
`;

export const ShootingStars = ({ intervalSec = 900 }: { intervalSec?: number }) => {
  const dpr = useThree((st) => st.viewport.dpr);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("aFade", new THREE.Float32BufferAttribute(new Float32Array(TRAIL), 1));
    return g;
  }, []);
  const st = useRef({ active: false, next: 30, start: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), ctrl: new THREE.Vector3() });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = st.current;
    const fadeAttr = geom.getAttribute("aFade") as THREE.BufferAttribute;
    if (!s.active && t >= s.next) {
      s.active = true;
      s.start = t;
      const z = R * 1.05;
      const y0 = R * (0.3 + Math.random() * 0.5);
      const dir = Math.random() > 0.5 ? 1 : -1;
      s.from.set(-dir * R * 1.5, y0, z);
      s.to.set(dir * R * 1.1, y0 - R * (0.6 + Math.random() * 0.5), z);
      s.ctrl.lerpVectors(s.from, s.to, 0.5).add(new THREE.Vector3(0, R * 0.15, R * 0.2));
    }
    if (!s.active) return;
    const dur = 2.4;
    const p = (t - s.start) / dur;
    if (p >= 1.25) {
      s.active = false;
      s.next = t + intervalSec;
      (fadeAttr.array as Float32Array).fill(0);
      fadeAttr.needsUpdate = true;
      return;
    }
    const posAttr = geom.getAttribute("position") as THREE.BufferAttribute;
    const life = Math.min(1, p * 4) * Math.max(0, Math.min(1, (1.25 - p) * 3));
    for (let i = 0; i < TRAIL; i++) {
      const q = Math.max(0, Math.min(1, p - i * 0.006));
      // Quadratic curve for a graceful arc.
      const a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c = q * q;
      tmp.set(0, 0, 0).addScaledVector(s.from, a).addScaledVector(s.ctrl, b).addScaledVector(s.to, c);
      const sparkle = i > 3 ? 0.75 + 0.25 * Math.sin(t * 40 + i * 2.3) : 1;
      posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
      fadeAttr.setX(i, p - i * 0.006 > 0 ? Math.pow(1 - i / TRAIL, 1.6) * life * sparkle : 0);
    }
    posAttr.needsUpdate = true;
    fadeAttr.needsUpdate = true;
  });

  return (
    <points geometry={geom} renderOrder={11} frustumCulled={false}>
      <shaderMaterial
        vertexShader={starVert}
        fragmentShader={starFrag}
        uniforms={{ uScale: { value: 1.4 * dpr } }}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default CityLights;
