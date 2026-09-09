import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect } from "react";
import { Scene } from "./Scene";
import { HUD } from "./HUD";
import { useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";
import { world } from "@/game/world";
import { music } from "@/game/music";
import { multiplayer, seedFromCode } from "@/game/multiplayer";

export function GameCanvas() {
  const start = useCallback((seedOverride?: number) => {
    const { track, musicOn, levelId } = useGameStore.getState();
    const def = levelById(levelId);
    const trackSeed = track ? Number(track.id.replace(/\D/g, "").slice(-8)) || 7 : 7;
    const seed = seedOverride ?? (def.seed || trackSeed);
    world.reset(seed, def.config);
    useGameStore.getState().start();
    if (track && musicOn) void music.play(track.previewUrl, 0.7);
  }, []);

  const jump = useCallback(() => {
    const { state, countdown } = useGameStore.getState();
    if (state === "playing") world.jumpQueued = true;
    else if (countdown === null) start();
  }, [start]);

  // live race: everyone starts together after a shared countdown
  useEffect(() => {
    multiplayer.onStart = ({ seed, levelId, at }) => {
      const store = useGameStore.getState();
      store.setLevel(levelId);
      const tick = () => {
        const left = Math.ceil((at - Date.now()) / 1000);
        if (left > 0) {
          store.setCountdown(left);
          setTimeout(tick, 250);
        } else {
          store.setCountdown(null);
          start(seed);
        }
      };
      tick();
    };
    return () => {
      multiplayer.onStart = null;
    };
  }, [start]);

  const startRace = useCallback(() => {
    const { roomCode, levelId } = useGameStore.getState();
    if (!roomCode) return;
    multiplayer.startRace(seedFromCode(roomCode), levelId);
  }, []);

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

  useEffect(
    () => () => {
      music.stop();
      void multiplayer.leave();
    },
    [],
  );

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
          camera={{ position: [3.2, 4, 15.5], fov: 55, far: 400 }}
          gl={{ antialias: true }}
        >
          <Scene />
        </Canvas>
      </div>
      <HUD onStart={() => start()} onStartRace={startRace} />
    </div>
  );
}
