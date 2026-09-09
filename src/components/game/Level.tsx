import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world, THEMES } from "@/game/world";
import { useGameStore } from "@/game/store";
import { music } from "@/game/music";
import { multiplayer } from "@/game/multiplayer";

const MAX_SPIKES = 40;
const MAX_BLOCKS = 30;
const MAX_PILLARS = 26;
const MAX_ORBS = 20;
const dummy = new THREE.Object3D();

function gridTexture(line: string, base: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = line;
  g.lineWidth = 6;
  g.globalAlpha = 0.55;
  g.strokeRect(0, 0, 256, 256);
  g.globalAlpha = 0.18;
  g.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    g.beginPath();
    g.moveTo((256 / 4) * i, 0);
    g.lineTo((256 / 4) * i, 256);
    g.moveTo(0, (256 / 4) * i);
    g.lineTo(256, (256 / 4) * i);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 6);
  return tex;
}

export function Level({ themeIndex }: { themeIndex: number }) {
  const theme = THEMES[themeIndex % THEMES.length]!;
  const spikes = useRef<THREE.InstancedMesh>(null);
  const blocks = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const orbs = useRef<THREE.InstancedMesh>(null);
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const rimLight = useRef<THREE.PointLight>(null);
  const pillarOffsets = useRef<number[]>(
    Array.from({ length: MAX_PILLARS }, (_, i) => i * 9 + (i % 3) * 2),
  );
  const tex = useMemo(() => gridTexture(theme.grid, theme.ground), [theme.grid, theme.ground]);
  const { camera } = useThree();

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const level = music.level(t);
    const beat = music.consumeBeat();
    const store = useGameStore.getState();

    if (store.state === "playing") {
      world.step(delta, level, beat);
      store.setScore(Math.floor(world.distance));
      if (multiplayer.inRoom) multiplayer.send(world.distance, world.playerY, true);
    } else if (store.state === "menu") {
      world.advance(6 * delta);
      world.maybeSpawn(level, beat);
    }

    // scrolling ground
    tex.offset.x = world.distance / 8;
    if (groundMat.current) {
      groundMat.current.emissiveIntensity = 0.25 + level * 1.2 + (beat ? 0.5 : 0);
    }
    if (rimLight.current) rimLight.current.intensity = 12 + level * 60;

    // camera: slight follow + music shake
    world.shake = Math.max(0, world.shake - delta * 3);
    const targetY = 3.4 + Math.min(world.playerY * 0.4, 2.4);
    camera.position.y += (targetY - camera.position.y) * (1 - Math.exp(-6 * delta));
    camera.position.z = 15.5 + level * 1.2 + world.shake * 1.2;
    camera.position.x = 3.2 + Math.sin(t * 1.1) * 0.15 + world.shake * (Math.random() - 0.5) * 0.8;
    camera.lookAt(3.2, world.playerY * 0.45 + 1.6, 0);

    // instances
    let si = 0;
    let bi = 0;
    let oi = 0;
    for (const o of world.obstacles) {
      if (o.type === "spike" && si < MAX_SPIKES) {
        dummy.position.set(o.x, o.h / 2, 0);
        dummy.rotation.set(0, Math.PI / 4, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        spikes.current?.setMatrixAt(si++, dummy.matrix);
      } else if (o.type === "block" && bi < MAX_BLOCKS) {
        dummy.position.set(o.x, o.h / 2, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(o.w, o.h, 2.6);
        dummy.updateMatrix();
        blocks.current?.setMatrixAt(bi++, dummy.matrix);
      } else if (o.type === "orb" && oi < MAX_ORBS) {
        dummy.position.set(o.x, o.h, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1 + Math.sin(t * 10 + o.x) * 0.15); 
        dummy.updateMatrix();
        orbs.current?.setMatrixAt(oi++, dummy.matrix);
      }
    }
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = si; i < MAX_SPIKES; i++) spikes.current?.setMatrixAt(i, dummy.matrix);
    for (let i = bi; i < MAX_BLOCKS; i++) blocks.current?.setMatrixAt(i, dummy.matrix);
    for (let i = oi; i < MAX_ORBS; i++) orbs.current?.setMatrixAt(i, dummy.matrix);
    
    if (spikes.current) spikes.current.instanceMatrix.needsUpdate = true;
    if (blocks.current) blocks.current.instanceMatrix.needsUpdate = true;
    if (orbs.current) orbs.current.instanceMatrix.needsUpdate = true;

    // background pillars react to the beat
    const offs = pillarOffsets.current;
    for (let i = 0; i < MAX_PILLARS; i++) {
      offs[i] = (offs[i]! - world.speed * delta * 0.55 + 240) % 240;
      const h = 6 + ((i * 7) % 11) + level * 9 * (1 + (i % 3) * 0.4);
      dummy.position.set(offs[i]! - 60, h / 2 - 2, i % 2 === 0 ? -16 - (i % 5) * 4 : 16 + (i % 5) * 4);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(2.4, h, 2.4);
      dummy.updateMatrix();
      pillars.current?.setMatrixAt(i, dummy.matrix);
    }
    if (pillars.current) pillars.current.instanceMatrix.needsUpdate = true;
  }); // <-- This is the bracket that was missing!

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 26]} />
        <meshStandardMaterial
          ref={groundMat}
          map={tex}
          color={theme.ground}
          emissive={theme.grid}
          emissiveIntensity={0.3}
          emissiveMap={tex}
          roughness={0.45}
          metalness={0.35}
        />
      </mesh>

      {/* glowing lane edges */}
      {[-3.2, 3.2].map((z) => (
        <mesh key={z} position={[0, 0.06, z]}>
          <boxGeometry args={[400, 0.12, 0.18]} />
          <meshBasicMaterial color={theme.grid} />
        </mesh>
      ))}

      <pointLight ref={rimLight} position={[2, 2, 4]} color={theme.grid} intensity={20} distance={30} />

      <instancedMesh ref={spikes} args={[null as any, null as any, MAX_SPIKES]} frustumCulled={false} castShadow>
        <coneGeometry args={[0.85, 1.5, 4]} />
        <meshStandardMaterial
          color={theme.spike}
          emissive={theme.spike}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.3}
          flatShading
        />
      </instancedMesh>

      <instancedMesh ref={blocks} args={[null as any, null as any, MAX_BLOCKS]} frustumCulled={false} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.block}
          emissive={theme.block}
          emissiveIntensity={0.28}
          roughness={0.35}
          metalness={0.4}
        />
      </instancedMesh>

      <instancedMesh ref={pillars} args={[null as any, null as any, MAX_PILLARS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.bg}
          emissive={theme.grid}
          emissiveIntensity={0.22}
          roughness={0.6}
          metalness={0.5}
        />
      </instancedMesh>
      
      <instancedMesh ref={orbs} args={[null as any, null as any, MAX_ORBS]} frustumCulled={false}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial
          color="#ffff00"
          emissive="#ffaa00"
          emissiveIntensity={3}
          roughness={0.1}
        />
      </instancedMesh>
    </group>
  );
}
