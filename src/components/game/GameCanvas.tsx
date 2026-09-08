import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { Scene } from "./Scene";
import { HUD } from "./HUD";
import { useGameStore } from "@/game/store";
import { world } from "@/game/world";
import { music } from "@/game/music";

export function GameCanvas() {
  const start = useCallback(() => {
    const { track, musicOn } = useGameStore.getState();
    const seed = track ? Number(track.id.replace(/\D/g, "").slice(-8)) || 7 : 7;
    world.reset(seed);
    useGameStore.getState().start();
    if (track && musicOn) void music.play(track.previewUrl, 0.7);
  }, []);

  const jump = useCallback(() => {
    const state = useGameStore.getState().state;
    if (state === "playing") world.jumpQueued = true;
    else start();
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  useEffect(() => () => music.stop(), []);

  return (
    <div className="fixed inset-0 bg-black">
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).tagName === "CANVAS") jump();
        }}
      >
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: [-7, 4.5, 13], fov: 55, far: 400 }}
          gl={{ antialias: true }}
        >
          <Scene />
        </Canvas>
      </div>
      <HUD onStart={start} />
    </div>
  );
}
