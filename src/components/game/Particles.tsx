import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world, PLAYER_RADIUS } from "@/game/world";
import { useGameStore, SKINS } from "@/game/store";

const TRAIL = 28;
const BURST = 48;
const dummy = new THREE.Object3D();

/** Trail behind the player plus a cube burst when a run ends. */
export function Particles() {
  const skin = useGameStore((s) => s.skin);
  const def = SKINS.find((s) => s.id === skin)!;
  const trail = useRef<THREE.InstancedMesh>(null);
  const burst = useRef<THREE.InstancedMesh>(null);
  const trailState = useRef(
    Array.from({ length: TRAIL }, () => ({ x: 0, y: 0, age: 9, seed: Math.random() })),
  );
  const burstState = useMemo(
    () =>
      Array.from({ length: BURST }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        r: Math.random() * Math.PI,
      })),
    [],
  );
  const lastDeath = useRef(-10);
  const burstAge = useRef(9);
  const emitAcc = useRef(0);
  const next = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const state = useGameStore.getState().state;

    // --- trail
    const ts = trailState.current;
    if (state === "playing") {
      emitAcc.current += delta;
      const every = 0.035;
      while (emitAcc.current > every) {
        emitAcc.current -= every;
        const p = ts[next.current]!;
        next.current = (next.current + 1) % TRAIL;
        p.x = -0.2;
        p.y = world.playerY + (Math.random() - 0.5) * 0.3;
        p.age = 0;
        p.seed = Math.random();
      }
    }
    for (let i = 0; i < TRAIL; i++) {
      const p = ts[i]!;
      p.age += delta;
      p.x -= world.speed * delta;
      const life = 0.55;
      const a = 1 - Math.min(1, p.age / life);
      dummy.position.set(p.x, p.y + p.seed * 0.15 - 0.1, (p.seed - 0.5) * 0.6);
      dummy.rotation.set(0, 0, p.age * 6);
      dummy.scale.setScalar(a > 0 ? 0.08 + a * 0.22 : 0);
      dummy.updateMatrix();
      trail.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trail.current) trail.current.instanceMatrix.needsUpdate = true;

    // --- death burst
    if (world.deathAt !== lastDeath.current && world.deathAt >= 0) {
      lastDeath.current = world.deathAt;
      burstAge.current = 0;
      for (const b of burstState) {
        b.p.set(0, world.deathY, 0);
        b.v.set((Math.random() - 0.7) * 14, Math.random() * 16 + 4, (Math.random() - 0.5) * 12);
      }
    }
    burstAge.current += delta;
    const alive = burstAge.current < 1.4;
    for (let i = 0; i < BURST; i++) {
      const b = burstState[i]!;
      if (alive) {
        b.v.y -= 40 * delta;
        b.p.addScaledVector(b.v, delta);
        if (b.p.y < 0.1) {
          b.p.y = 0.1;
          b.v.y *= -0.45;
          b.v.x *= 0.8;
        }
      }
      const fade = alive ? 1 - burstAge.current / 1.4 : 0;
      dummy.position.copy(b.p);
      dummy.rotation.set(b.r + burstAge.current * 5, b.r * 2, burstAge.current * 3);
      dummy.scale.setScalar(fade * 0.26);
      dummy.updateMatrix();
      burst.current?.setMatrixAt(i, dummy.matrix);
    }
    if (burst.current) burst.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.85} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={burst} args={[undefined, undefined, BURST]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={def.color}
          emissive={def.color}
          emissiveIntensity={1.6}
          roughness={0.3}
        />
      </instancedMesh>
      {/* landing shadow disc keeps the player readable above the floor */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[PLAYER_RADIUS * 0.9, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
