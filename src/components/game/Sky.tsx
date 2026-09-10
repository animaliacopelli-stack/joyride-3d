import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { music } from "@/game/music";
import type { Theme } from "@/game/world";

/**
 * Gradient sky dome with a slow aurora band and a horizon sun glow.
 * Colours come from the active theme; the aurora brightens with the music.
 */
export function Sky({ theme }: { theme: Theme }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(theme.bg) },
      uBottom: { value: new THREE.Color(theme.fog) },
      uGlow: { value: new THREE.Color(theme.grid) },
      uAccent: { value: new THREE.Color(theme.light) },
      uTime: { value: 0 },
      uLevel: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;
    const lvl = music.level(t);
    uniforms.uLevel.value += (lvl - uniforms.uLevel.value) * 0.1;
    // ease between themes instead of snapping
    uniforms.uTop.value.lerp(new THREE.Color(theme.bg), 0.05);
    uniforms.uBottom.value.lerp(new THREE.Color(theme.fog), 0.05);
    uniforms.uGlow.value.lerp(new THREE.Color(theme.grid), 0.05);
    uniforms.uAccent.value.lerp(new THREE.Color(theme.light), 0.05);
  });

  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false} renderOrder={-1}>
      <sphereGeometry args={[240, 32, 24]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        depthWrite={false}
        side={THREE.BackSide}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec3 vPos;
          uniform vec3 uTop;
          uniform vec3 uBottom;
          uniform vec3 uGlow;
          uniform vec3 uAccent;
          uniform float uTime;
          uniform float uLevel;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }

          void main() {
            vec3 dir = normalize(vPos);
            float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

            vec3 col = mix(uBottom, uTop, pow(h, 0.85));

            // horizon glow band
            float horizon = exp(-pow(abs(dir.y - 0.02) * 7.0, 2.0));
            col += uGlow * horizon * (0.22 + uLevel * 0.35);

            // distant sun behind the track
            vec2 sunDir = normalize(vec2(0.12, 0.16));
            float sun = exp(-length(vec2(dir.x, dir.y) - sunDir) * 6.0) * step(-0.25, dir.z);
            col += uAccent * sun * (0.30 + uLevel * 0.25);

            // slow aurora ribbons in the upper sky
            float n = noise(vec2(dir.x * 2.4 + uTime * 0.05, dir.y * 3.4 - uTime * 0.03));
            float ribbon = smoothstep(0.55, 0.95, n) * smoothstep(0.05, 0.55, dir.y);
            col += mix(uGlow, uAccent, n) * ribbon * (0.16 + uLevel * 0.4);

            // subtle grain so the gradient never bands
            col += (hash(dir.xy * 512.0) - 0.5) * 0.012;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
}
