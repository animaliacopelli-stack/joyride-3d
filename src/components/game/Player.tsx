import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { world, GRAVITY, JUMP_V, PLAYER_RADIUS as RADIUS } from "@/game/world";
import { useGameStore, skinById, type SkinMood } from "@/game/store";

export function Player({ onDeath }: { onDeath: () => void }) {
  const skin = useGameStore((s) => s.skin);
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const squash = useRef(1);
  const def = skinById(skin);


  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const state = useGameStore.getState().state;

    if (state === "dead") {
      g.visible = false;
      return;
    }
    g.visible = true;

    if (state !== "playing") {
      const idle = Math.sin(performance.now() / 400) * 0.12;
      g.position.set(0, 1.1 + idle, 0);
      g.rotation.z = 0;
      g.rotation.y += delta * 0.8;
      return;
    }
    g.rotation.y = 0;

    // collisions + orb trigger zone
    let support = 0;
    let dead = false;
    let nearOrb: number | null = null;
    const bottom = world.playerY - RADIUS;

    for (const o of world.obstacles) {
      if (o.type === "orb") {
        const dx = o.x;
        const dy = o.h - world.playerY;
        if (dx * dx + dy * dy < (RADIUS + 1.7) ** 2) nearOrb = o.h;
        continue;
      }
      if (o.x > RADIUS + o.w / 2 || o.x < -(RADIUS + o.w / 2)) continue;
      if (o.type === "spike") {
        // forgiving hitbox: only the core of the spike kills
        if (Math.abs(o.x) < RADIUS + o.w / 2 - 0.25 && bottom < o.h - 0.3) dead = true;
      } else if (bottom < o.h - 0.3) {
        if (world.playerVy > 0 || bottom < o.h - 0.9) dead = true;
        else support = Math.max(support, o.h);
      } else {
        support = Math.max(support, o.h);
      }
    }

    if (world.jumpQueued) {
      if (nearOrb !== null) {
        world.playerVy = JUMP_V * 1.25;
        world.jumps = 1; // one more jump available after a ring
        world.grounded = false;
        world.orbAt = world.clock;
        world.orbY = nearOrb;
        squash.current = 1.35;
      } else if (world.jumps < 2) {
        world.playerVy = JUMP_V;
        world.jumps++;
        world.grounded = false;
        squash.current = 1.25;
      }
      world.jumpQueued = false;
    }

    world.playerVy += GRAVITY * delta;
    world.playerY += world.playerVy * delta;

    const floor = support + RADIUS;
    if (world.playerY <= floor) {
      world.playerY = floor;
      if (world.playerVy < 0) {
        if (!world.grounded) squash.current = 0.72;
        world.playerVy = 0;
      }
      if (!world.grounded) {
        world.rotation = Math.round(world.rotation / (Math.PI / 2)) * (Math.PI / 2);
        world.jumps = 0;
      }
      world.grounded = true;
    } else {
      world.grounded = false;
    }

    if (!world.grounded) world.rotation -= delta * 7.5;

    // squash & stretch
    squash.current += (1 - squash.current) * Math.min(1, delta * 10);
    if (body.current) {
      const s = squash.current;
      body.current.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }

    g.position.set(0, world.playerY, 0);
    g.rotation.z = world.rotation;
    if (glow.current) glow.current.intensity = 10 + Math.sin(performance.now() / 120) * 2;

    if (dead) {
      world.shake = 1;
      world.deathAt = world.clock;
      world.deathY = world.playerY;
      onDeath();
    }
  });

  return (
    <group ref={group} position={[0, 1.1, 0]}>
      <pointLight ref={glow} color={def.color} intensity={10} distance={10} />
      <group ref={body}>
        {skin === "smiley" && (
          <group>
            <mesh castShadow>
              <sphereGeometry args={[RADIUS, 40, 32]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.accent}
                emissiveIntensity={0.35}
                roughness={0.3}
                metalness={0.05}
              />
            </mesh>
            <Face z={RADIUS * 0.94} />
          </group>
        )}
        {skin === "cube" && (
          <group>
            <mesh castShadow>
              <boxGeometry args={[RADIUS * 1.75, RADIUS * 1.75, RADIUS * 1.75]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.accent}
                emissiveIntensity={0.4}
                roughness={0.3}
                metalness={0.2}
              />
            </mesh>
            <mesh>
              <boxGeometry args={[RADIUS * 1.8, RADIUS * 1.8, RADIUS * 1.8]} />
              <meshBasicMaterial color={def.color} wireframe transparent opacity={0.5} />
            </mesh>
            <Face z={RADIUS * 0.9} />
          </group>
        )}
        {skin === "prism" && (
          <group>
            <mesh castShadow rotation-x={Math.PI / 2}>
              <octahedronGeometry args={[RADIUS * 1.15, 0]} />
              <meshStandardMaterial
                color={def.color}
                emissive={def.accent}
                emissiveIntensity={0.8}
                roughness={0.2}
                metalness={0.4}
                flatShading
              />
            </mesh>
            <Face z={RADIUS * 0.62} />
          </group>
        )}
      </group>
    </group>
  );
}

function Face({ z }: { z: number }) {
  return (
    <group position={[0, 0.06, z]}>
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} position={[x, 0.09, 0]} scale={[1, 1.4, 0.5]}>
          <sphereGeometry args={[0.075, 16, 12]} />
          <meshStandardMaterial color="#20160a" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -0.1, 0]} rotation-z={Math.PI} scale={[1, 0.5, 1]}>
        <torusGeometry args={[0.2, 0.045, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#20160a" roughness={0.4} />
      </mesh>
    </group>
  );
}
