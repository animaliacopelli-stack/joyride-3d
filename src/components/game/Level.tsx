import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { world, THEMES } from "@/game/world";
import { useGameStore } from "@/game/store";
import { music } from "@/game/music";
import { multiplayer } from "@/game/multiplayer";
import { resolveGrid } from "@/game/rhythm";

const MAX_SPIKES = 48;
const MAX_BLOCKS = 32;
const MAX_PILLARS = 28;
const MAX_ORBS = 20;
const MAX_TILES = 24;
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
  const spikeGlow = useRef<THREE.InstancedMesh>(null);
  const blocks = useRef<THREE.InstancedMesh>(null);
  const blockEdges = useRef<THREE.InstancedMesh>(null);
  const pillars = useRef<THREE.InstancedMesh>(null);
  const orbs = useRef<THREE.InstancedMesh>(null);
  const orbCores = useRef<THREE.InstancedMesh>(null);
  const tiles = useRef<THREE.InstancedMesh>(null);
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const edgeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const rimLight = useRef<THREE.PointLight>(null);
  const orbLight = useRef<THREE.PointLight>(null);
  const pillarOffsets = useRef<number[]>(
    Array.from({ length: MAX_PILLARS }, (_, i) => i * 9 + (i % 3) * 2),
  );
  const tex = useMemo(() => gridTexture(theme.grid, theme.ground), [theme.grid, theme.ground]);
  const { camera } = useThree();
  const pulse = useRef(0);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const level = music.level(t);
    music.consumeBeat();
    const store = useGameStore.getState();
    const grid = resolveGrid();
    const usesMusic = !!store.track && store.musicOn;

    if (store.state === "playing") {
      const now = world.sync(delta, usesMusic ? music.songTime() : null);
      world.step(delta, now, grid);
      store.setScore(Math.floor(world.distance));
      if (multiplayer.inRoom) multiplayer.send(world.distance, world.playerY, true);
    } else if (store.state === "menu") {
      if (world.mode !== "menu") world.reset(11, undefined, "menu");
      const now = world.sync(delta, usesMusic ? music.songTime() : null);
      world.step(delta, now, grid);
    }

    // beat pulse straight from the grid: exact, not guessed
    const phase = world.beatPhase(world.clock, grid);
    const beatPulse = Math.pow(1 - phase, 3);
    pulse.current = beatPulse;
    const glow = 0.22 + level * 0.9 + beatPulse * 0.5;

    tex.offset.x = world.distance / 8;
    if (groundMat.current) groundMat.current.emissiveIntensity = glow;
    for (const m of edgeMats.current) if (m) m.color.copy(new THREE.Color(theme.grid)).multiplyScalar(1.2 + beatPulse * 1.6);
    if (rimLight.current) rimLight.current.intensity = 12 + level * 50 + beatPulse * 25;

    // camera: soft follow + hit shake
    world.shake = Math.max(0, world.shake - delta * 3);
    const targetY = 3.4 + Math.min(world.playerY * 0.4, 2.4);
    camera.position.y += (targetY - camera.position.y) * (1 - Math.exp(-6 * delta));
    camera.position.z = 15.5 + level * 1.2 + world.shake * 1.4 - beatPulse * 0.25;
    camera.position.x = 3.2 + Math.sin(t * 1.1) * 0.15 + world.shake * (Math.random() - 0.5) * 0.9;
    camera.lookAt(3.2, world.playerY * 0.45 + 1.6, 0);

    // obstacles
    let si = 0;
    let bi = 0;
    let oi = 0;
    let ti = 0;
    let nearestOrb: { x: number; y: number } | null = null;
    for (const o of world.obstacles) {
      if (o.type === "spike" && si < MAX_SPIKES) {
        dummy.position.set(o.x, o.h / 2, 0);
        dummy.rotation.set(0, Math.PI / 4, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        spikes.current?.setMatrixAt(si, dummy.matrix);
        dummy.scale.setScalar(1.12 + beatPulse * 0.08);
        dummy.position.y = (o.h / 2) * dummy.scale.y;
        dummy.updateMatrix();
        spikeGlow.current?.setMatrixAt(si, dummy.matrix);
        si++;
      } else if (o.type === "block" && bi < MAX_BLOCKS) {
        dummy.position.set(o.x, o.h / 2, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(o.w, o.h, 2.6);
        dummy.updateMatrix();
        blocks.current?.setMatrixAt(bi, dummy.matrix);
        dummy.scale.set(o.w + 0.06, 0.1, 2.7);
        dummy.position.y = o.h;
        dummy.updateMatrix();
        blockEdges.current?.setMatrixAt(bi, dummy.matrix);
        bi++;
      } else if (o.type === "orb" && oi < MAX_ORBS) {
        const bob = Math.sin(t * 4 + o.t) * 0.08;
        dummy.position.set(o.x, o.h + bob, 0);
        dummy.rotation.set(0, t * 1.6, 0);
        dummy.scale.setScalar(1 + beatPulse * 0.22);
        dummy.updateMatrix();
        orbs.current?.setMatrixAt(oi, dummy.matrix);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.85 + Math.sin(t * 9 + o.t) * 0.12);
        dummy.updateMatrix();
        orbCores.current?.setMatrixAt(oi, dummy.matrix);
        oi++;
        if (o.x > -1 && (!nearestOrb || o.x < nearestOrb.x)) nearestOrb = { x: o.x, y: o.h };
      }
      // beat tile under every hazard that sits on the ground
      if (o.type !== "orb" && ti < MAX_TILES && o.dx === 0) {
        dummy.position.set(o.x, 0.03, 0);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        const near = Math.max(0, 1 - Math.abs(o.x) / 30);
        dummy.scale.set(1.4 + near * 0.6, 3.2, 1);
        dummy.updateMatrix();
        tiles.current?.setMatrixAt(ti++, dummy.matrix);
      }
    }
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    for (let i = si; i < MAX_SPIKES; i++) {
      spikes.current?.setMatrixAt(i, dummy.matrix);
      spikeGlow.current?.setMatrixAt(i, dummy.matrix);
    }
    for (let i = bi; i < MAX_BLOCKS; i++) {
      blocks.current?.setMatrixAt(i, dummy.matrix);
      blockEdges.current?.setMatrixAt(i, dummy.matrix);
    }
    for (let i = oi; i < MAX_ORBS; i++) {
      orbs.current?.setMatrixAt(i, dummy.matrix);
      orbCores.current?.setMatrixAt(i, dummy.matrix);
    }
    for (let i = ti; i < MAX_TILES; i++) tiles.current?.setMatrixAt(i, dummy.matrix);

    for (const m of [spikes, spikeGlow, blocks, blockEdges, orbs, orbCores, tiles]) {
      if (m.current) m.current.instanceMatrix.needsUpdate = true;
    }

    if (orbLight.current) {
      if (nearestOrb && nearestOrb.x < 30) {
        orbLight.current.visible = true;
        orbLight.current.position.set(nearestOrb.x, nearestOrb.y, 0.5);
        orbLight.current.intensity = 14 + beatPulse * 16;
      } else orbLight.current.visible = false;
    }

    // background pillars breathe with the music
    const offs = pillarOffsets.current;
    for (let i = 0; i < MAX_PILLARS; i++) {
      offs[i] = (offs[i]! - world.speed * delta * 0.55 + 250) % 250;
      const h = 6 + ((i * 7) % 11) + level * 9 * (1 + (i % 3) * 0.4) + beatPulse * 1.5;
      dummy.position.set(offs[i]! - 60, h / 2 - 2, i % 2 === 0 ? -16 - (i % 5) * 4 : 16 + (i % 5) * 4);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(2.4, h, 2.4);
      dummy.updateMatrix();
      pillars.current?.setMatrixAt(i, dummy.matrix);
    }
    if (pillars.current) pillars.current.instanceMatrix.needsUpdate = true;
  });

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
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>

      {/* glowing lane edges */}
      {[-3.2, 3.2].map((z, i) => (
        <mesh key={z} position={[0, 0.06, z]}>
          <boxGeometry args={[400, 0.12, 0.18]} />
          <meshBasicMaterial
            ref={(el) => {
              edgeMats.current[i] = el;
            }}
            color={theme.grid}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* beat tiles */}
      <instancedMesh ref={tiles} args={[undefined, undefined, MAX_TILES]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={theme.grid} transparent opacity={0.28} toneMapped={false} depthWrite={false} />
      </instancedMesh>

      <pointLight ref={rimLight} position={[2, 2, 4]} color={theme.grid} intensity={20} distance={30} />
      <pointLight ref={orbLight} color="#ffd23f" intensity={14} distance={9} visible={false} />

      <instancedMesh ref={spikes} args={[undefined, undefined, MAX_SPIKES]} frustumCulled={false} castShadow>
        <coneGeometry args={[0.85, 1.5, 4]} />
        <meshStandardMaterial
          color={theme.spike}
          emissive={theme.spike}
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.3}
          flatShading
        />
      </instancedMesh>
      <instancedMesh ref={spikeGlow} args={[undefined, undefined, MAX_SPIKES]} frustumCulled={false}>
        <coneGeometry args={[0.85, 1.5, 4]} />
        <meshBasicMaterial color={theme.spike} wireframe transparent opacity={0.6} toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={blocks} args={[undefined, undefined, MAX_BLOCKS]} frustumCulled={false} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.block}
          emissive={theme.block}
          emissiveIntensity={0.25}
          roughness={0.35}
          metalness={0.4}
        />
      </instancedMesh>
      <instancedMesh ref={blockEdges} args={[undefined, undefined, MAX_BLOCKS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={theme.light} toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={pillars} args={[undefined, undefined, MAX_PILLARS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.bg}
          emissive={theme.grid}
          emissiveIntensity={0.22}
          roughness={0.6}
          metalness={0.5}
        />
      </instancedMesh>

      {/* yellow jump rings, just like the ones you tap in the air */}
      <instancedMesh ref={orbs} args={[undefined, undefined, MAX_ORBS]} frustumCulled={false}>
        <torusGeometry args={[0.62, 0.11, 12, 32]} />
        <meshStandardMaterial color="#ffe14a" emissive="#ffb400" emissiveIntensity={2.2} roughness={0.2} />
      </instancedMesh>
      <instancedMesh ref={orbCores} args={[undefined, undefined, MAX_ORBS]} frustumCulled={false}>
        <sphereGeometry args={[0.36, 18, 14]} />
        <meshBasicMaterial color="#fff2a8" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
