import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { Level } from "./Level";
import { Player } from "./Player";
import { useGameStore } from "@/game/store";
import { world, THEMES } from "@/game/world";
import { music } from "@/game/music";

export function Scene() {
  const [themeIndex, setThemeIndex] = useState(0);
  const state = useGameStore((s) => s.state);
  const deadRef = useRef(false);
  const theme = THEMES[themeIndex % THEMES.length]!;

  useEffect(() => {
    if (state === "playing") deadRef.current = false;
  }, [state]);

  // rotate theme with progress
  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.floor(world.distance / 700) % THEMES.length;
      setThemeIndex((prev) => (prev === next ? prev : next));
    }, 500);
    return () => clearInterval(id);
  }, []);

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
      <Player onDeath={handleDeath} />
    </>
  );
}
