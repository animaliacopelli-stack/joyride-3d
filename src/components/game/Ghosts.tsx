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

const MIN_X = -26;
const MAX_X = 34;

function Ghost({ id, name, color }: Label) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const arrow = useRef<THREE.Mesh>(null);
  const tag = useRef<HTMLDivElement>(null);
  const smooth = useRef<{ x: number; y: number } | null>(null);

  useFrame((_, delta) => {
    const g = group.current;
    const p = multiplayer.peers.get(id);
    if (!g || !p) {
      if (g) g.visible = false;
      return;
    }
    // predict forward from the last packet so movement stays fluid between updates
    const age = Math.min(0.4, (performance.now() - p.t) / 1000);
    const predicted = p.dist + (p.alive ? p.vd * age : 0);
    const rawX = predicted - world.distance;
    const targetX = THREE.MathUtils.clamp(rawX, MIN_X, MAX_X);
    const targetY = p.y;

    if (!smooth.current) smooth.current = { x: targetX, y: targetY };
    const k = 1 - Math.pow(0.0015, delta); // fast, frame-rate independent catch-up
    smooth.current.x += (targetX - smooth.current.x) * k;
    smooth.current.y += (targetY - smooth.current.y) * k;

    g.visible = true;
    g.position.set(smooth.current.x, smooth.current.y, -1.5);
    g.rotation.y += delta * 1.6;

    const clipped = rawX > MAX_X || rawX < MIN_X;
    if (mat.current) mat.current.opacity = p.alive ? (clipped ? 0.45 : 0.85) : 0.22;
    if (ring.current) {
      const s = 1 + Math.sin(performance.now() / 260) * 0.06;
      ring.current.scale.setScalar(s);
      ring.current.visible = p.alive;
    }
    if (arrow.current) {
      arrow.current.visible = clipped && p.alive;
      arrow.current.rotation.z = rawX > MAX_X ? -Math.PI / 2 : Math.PI / 2;
    }
    if (tag.current) {
      const gap = Math.round(rawX);
      tag.current.textContent = gap === 0 ? name : `${name} ${gap > 0 ? "+" : ""}${gap}m`;
    }
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <sphereGeometry args={[0.66, 28, 20]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
          transparent
          opacity={0.85}
          roughness={0.25}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.78, 18, 14]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
      </mesh>
      {/* pulsing halo so a ghost reads instantly against the neon scenery */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, -0.62, 0]}>
        <ringGeometry args={[0.85, 1.25, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <pointLight color={color} intensity={6} distance={9} decay={2} />
      {/* edge marker when the racer is off past the camera */}
      <mesh ref={arrow} position={[0, 1.1, 0]} visible={false}>
        <coneGeometry args={[0.28, 0.7, 3]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      <Html center position={[0, 1.6, 0]} distanceFactor={13} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div
          ref={tag}
          style={{ borderColor: color, color }}
          className="whitespace-nowrap rounded-full border-2 bg-black/70 px-2.5 py-0.5 font-body text-xs font-bold backdrop-blur"
        >
          {name}
        </div>
      </Html>
    </group>
  );
}
