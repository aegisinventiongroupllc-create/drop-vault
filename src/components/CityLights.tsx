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
  void main() {
    float tw = 0.72 + 0.28 * sin(uTime * 2.6 + aPhase) + 0.14 * sin(uTime * 6.1 + aPhase * 1.7);
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
    vec3 col = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.95, 0.75), core * core * core);
    gl_FragColor = vec4(col, core * core * vGlow * 0.8);
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
      const n = Math.round((24 + Math.min(420, Math.sqrt(c.people) * 26)) * density);
      const spread = 2.5 + Math.min(3, Math.log2(1 + c.people) * 0.6);
      // A few "city" hubs per country so lights cluster like real cities.
      const hubs = Array.from({ length: 4 }, () => [c.lat + (r() - 0.5) * spread * 0.5, c.lng + (r() - 0.5) * spread * 0.7]);
      for (let i = 0; i < n; i++) {
        const h = hubs[i % hubs.length];
        const g = () => (r() + r() + r() - 1.5) * spread * 0.35;
        const [x, y, z] = latLngToVec3(h[0] + g(), h[1] + g(), R * 1.004);
        pos.push(x, y, z);
        phase.push(r() * Math.PI * 2);
        size.push(i % 13 === 0 ? 9 : 2.5 + r() * 2.5);
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
 * A beautiful shooting star that streaks past the Earth every `intervalSec`
 * seconds (default 15 minutes). Bright head with a fading tail, additive glow.
 */
export const ShootingStars = ({ intervalSec = 900 }: { intervalSec?: number }) => {
  const head = useRef<THREE.Mesh>(null);
  const headMat = useRef<THREE.MeshBasicMaterial>(null);
  const tailObj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineBasicMaterial({ color: "#ffe9b0", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.Line(g, m);
    l.visible = false;
    return l;
  }, []);
  const st = useRef({
    active: false,
    next: 8, // first one early so visitors catch it, then every intervalSec
    start: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
  });
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = st.current;
    if (!s.active && t >= s.next) {
      s.active = true;
      s.start = t;
      // Streak across the face of the globe on a plane just above the
      // surface, so the whole path stays inside the view.
      const z = R * 1.02;
      const y0 = (Math.random() - 0.5) * R * 0.8;
      const y1 = y0 + (Math.random() - 0.5) * R * 0.5;
      const dir = Math.random() > 0.5 ? 1 : -1;
      s.from.set(-dir * R * 1.2, y0, z);
      s.to.set(dir * R * 1.2, y1, z);
    }
    if (!s.active) return;
    const p = (t - s.start) / 3.0;
    if (p >= 1) {
      s.active = false;
      s.next = t + intervalSec;
      if (head.current) head.current.visible = false;
      tailObj.visible = false;
      return;
    }
    const ease = p * p * (3 - 2 * p);
    const pos = new THREE.Vector3().lerpVectors(s.from, s.to, ease);
    const tailPos = new THREE.Vector3().lerpVectors(s.from, s.to, Math.max(0, ease - 0.18));
    const fade = Math.sin(Math.PI * p);
    if (head.current && headMat.current) {
      head.current.visible = true;
      head.current.position.copy(pos);
      headMat.current.opacity = fade;
    }
    tailObj.visible = true;
    const attr = tailObj.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
    attr.setXYZ(1, pos.x, pos.y, pos.z);
    attr.needsUpdate = true;
    (tailObj.material as THREE.LineBasicMaterial).opacity = fade * 0.85;
  });

  return (
    <group renderOrder={11}>
      <mesh ref={head} visible={false}>
        <sphereGeometry args={[R * 0.022, 10, 10]} />
        <meshBasicMaterial ref={headMat} color="#fff7e0" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <primitive object={tailObj} />
    </group>
  );
};

export default CityLights;
