import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world } from "@/game/world";
import { useGameStore, SKINS, type SkinId } from "@/game/store";

const GRAVITY = -60;
const JUMP_V = 21.5;
const RADIUS = 0.62;

function makeFaceTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#20160a";
  g.beginPath();
  g.ellipse(92, 100, 14, 20, 0, 0, Math.PI * 2);
  g.ellipse(164, 100, 14, 20, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#20160a";
  g.lineWidth = 12;
  g.lineCap = "round";
  g.beginPath();
  g.arc(128, 140, 46, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Player({ onDeath }: { onDeath: () => void }) {
  const skin = useGameStore((s) => s.skin);
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const def = SKINS.find((s) => s.id === skin)!;
  const face = useMemo(() => makeFaceTexture(def.color), [def.color]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const g = group.current;
    if (!g) return;
    const state = useGameStore.getState().state;

    if (state !== "playing") {
      const idle = Math.sin(performance.now() / 400) * 0.12;
      g.position.set(0, 1.1 + idle, 0);
      g.rotation.z = 0;
      g.rotation.y += delta * 0.8;
      return;
    }

    // vertical integration
    if (world.jumpQueued && world.grounded) {
      world.playerVy = JUMP_V;
      world.grounded = false;
    }
    world.jumpQueued = false;
    world.playerVy += GRAVITY * delta;
    world.playerY += world.playerVy * delta;

    // find support / collisions
    let support = 0;
    let dead = false;
    const bottom = world.playerY - RADIUS;
    for (const o of world.obstacles) {
      if (o.x > RADIUS + o.w / 2 || o.x < -(RADIUS + o.w / 2)) continue;
      if (o.type === "spike") {
        if (bottom < o.h - 0.25) dead = true;
      } else {
        if (bottom < o.h - 0.3) {
          // hit the wall face unless we're landing from above
          if (world.playerVy > 0 || bottom < o.h - 0.9) dead = true;
          else support = Math.max(support, o.h);
        } else {
          support = Math.max(support, o.h);
        }
      }
    }

    const floor = support + RADIUS;
    if (world.playerY <= floor) {
      world.playerY = floor;
      if (world.playerVy < 0) world.playerVy = 0;
      if (!world.grounded) world.rotation = Math.round(world.rotation / (Math.PI / 2)) * (Math.PI / 2);
      world.grounded = true;
    } else {
      world.grounded = false;
    }

    if (!world.grounded) world.rotation -= delta * 7.5;

    g.position.set(0, world.playerY, 0);
    g.rotation.z = world.rotation;
    if (glow.current) glow.current.intensity = 8 + Math.sin(performance.now() / 120) * 2;

    if (dead) {
      world.shake = 1;
      onDeath();
    }
  });

  return (
    <group ref={group} position={[0, 1.1, 0]}>
      <pointLight ref={glow} color={def.color} intensity={8} distance={9} />
      {skin === "smiley" && (
        <group>
          <mesh castShadow>
            <sphereGeometry args={[RADIUS, 40, 32]} />
            <meshStandardMaterial
              color={def.color}
              emissive={def.accent}
              emissiveIntensity={0.25}
              roughness={0.35}
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
              map={face}
              emissive={def.accent}
              emissiveIntensity={0.3}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
          <Face z={RADIUS * 0.9} />
        </group>
      )}
      {skin === "prism" && (
        <mesh castShadow rotation-x={Math.PI / 2}>
          <octahedronGeometry args={[RADIUS * 1.15, 0]} />
          <meshStandardMaterial
            color={def.color}
            emissive={def.accent}
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.4}
            flatShading
          />
        </mesh>
      )}
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

