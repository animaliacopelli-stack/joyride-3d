import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Level } from "./Level";
import { Player } from "./Player";
import { Ghosts } from "./Ghosts";
import { useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";
import { world, THEMES } from "@/game/world";
import { music } from "@/game/music";

export function Scene() {
  const levelId = useGameStore((s) => s.levelId);
  const def = levelById(levelId);
  const [rotating, setRotating] = useState(0);
  const state = useGameStore((s) => s.state);
  const deadRef = useRef(false);
  const themeIndex = def.rotateTheme ? rotating : def.themeIndex;
  const theme = THEMES[themeIndex % THEMES.length]!;

  useEffect(() => {
    if (state === "playing") deadRef.current = false;
  }, [state]);

  // endless mode drifts through themes as you survive
  useEffect(() => {
    if (!def.rotateTheme) return;
    const id = setInterval(() => {
      const next = Math.floor(world.distance / 700) % THEMES.length;
      setRotating((prev) => (prev === next ? prev : next));
    }, 500);
    return () => clearInterval(id);
  }, [def.rotateTheme]);

  const handleDeath = () => {
    if (deadRef.current) return;
    deadRef.current = true;
    music.pause();
    useGameStore.getState().die();
  };

  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.fog, 26, 95]} />
      <hemisphereLight args={[theme.light, theme.ground, 0.75]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.6}
        color={theme.light}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={20}
        shadow-camera-bottom={-10}
      />
      <Environment>
        <Lightformer intensity={1.6} position={[0, 8, 2]} scale={[14, 8, 1]} color={theme.light} />
        <Lightformer
          intensity={1.2}
          color={theme.grid}
          position={[-8, 2, -6]}
          rotation-y={Math.PI / 2}
          scale={[24, 3, 1]}
        />
      </Environment>
      <Level themeIndex={themeIndex} />
      <Ghosts />
      <Player onDeath={handleDeath} />
    </>
  );
}
