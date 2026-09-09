import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { multiplayer } from "@/game/multiplayer";
import { world } from "@/game/world";

const MAX_GHOSTS = 7;

/** Translucent stand-ins for the other racers in the room. */
export function Ghosts() {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame(() => {
    const peers = multiplayer.list();
    for (let i = 0; i < MAX_GHOSTS; i++) {
      const g = groups.current[i];
      if (!g) continue;
      const p = peers[i];
      if (!p) {
        g.visible = false;
        continue;
      }
      const offset = THREE.MathUtils.clamp(p.dist - world.distance, -22, 22);
      g.visible = true;
      g.position.set(offset, p.y, -2.1);
      g.rotation.y += 0.02;
      const m = mats.current[i];
      if (m) {
        m.color.set(p.color);
        m.emissive.set(p.color);
        m.opacity = p.alive ? 0.45 : 0.15;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_GHOSTS }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          visible={false}
        >
          <mesh>
            <sphereGeometry args={[0.62, 24, 18]} />
            <meshStandardMaterial
              ref={(el) => {
                mats.current[i] = el;
              }}
              transparent
              opacity={0.45}
              emissiveIntensity={0.7}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
