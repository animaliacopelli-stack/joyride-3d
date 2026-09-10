import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { multiplayer } from "@/game/multiplayer";
import { world } from "@/game/world";

type Label = { id: string; name: string; color: string };

/** Glowing stand-ins for the other racers, with a name tag each. */
export function Ghosts() {
  const [labels, setLabels] = useState<Label[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const peers = multiplayer.list().slice(0, 7);
      setLabels((prev) => {
        const next = peers.map((p) => ({ id: p.id, name: p.name, color: p.color }));
        const same =
          prev.length === next.length &&
          prev.every((l, i) => l.id === next[i]!.id && l.name === next[i]!.name && l.color === next[i]!.color);
        return same ? prev : next;
      });
    }, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <group>
      {labels.map((l) => (
        <Ghost key={l.id} {...l} />
      ))}
    </group>
  );
}

function Ghost({ id, name, color }: Label) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const g = group.current;
    const p = multiplayer.peers.get(id);
    if (!g || !p) {
      if (g) g.visible = false;
      return;
    }
    const offset = THREE.MathUtils.clamp(p.dist - world.distance, -24, 40);
    g.visible = true;
    g.position.set(offset, p.y, -1.9);
    g.rotation.y += 0.02;
    if (mat.current) mat.current.opacity = p.alive ? 0.6 : 0.2;
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[0.62, 24, 18]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          transparent
          opacity={0.6}
          roughness={0.3}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 16, 12]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.35} />
      </mesh>
      <Html center position={[0, 1.35, 0]} distanceFactor={14} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{ borderColor: color, color }}
          className="whitespace-nowrap rounded-full border bg-black/60 px-2.5 py-0.5 font-body text-xs font-bold backdrop-blur"
        >
          {name}
        </div>
      </Html>
    </group>
  );
}
