import { Canvas } from "@react-three/fiber";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { Scene } from "./Scene";
import { HUD } from "./HUD";
import { useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";
import { world } from "@/game/world";
import { music } from "@/game/music";
import { multiplayer, seedFromCode } from "@/game/multiplayer";
import { submitRun } from "@/lib/leaderboard";

const MIN_RANKED_DISTANCE = 15;

export function GameCanvas() {
  const queryClient = useQueryClient();

  const start = useCallback((seedOverride?: number) => {
    const { track, musicOn, levelId } = useGameStore.getState();
    const def = levelById(levelId);
    // every attempt builds a fresh layout — races share the room's seed instead
    const seed = seedOverride ?? ((Math.random() * 0xffffffff) >>> 0);
    world.reset(seed, def.config, "run");

    useGameStore.getState().start();
    if (track && musicOn) void music.play(track, 0.7);
    else music.stop();
  }, []);

  const jump = useCallback(() => {
    const { state, countdown } = useGameStore.getState();
    if (state === "playing") world.jumpQueued = true;
    else if (countdown === null) start();
  }, [start]);

  // beat analysis results flow into the store so the tempo panel can show them
  useEffect(() => {
    music.onAnalysis = (id, a, analyzing) => {
      const s = useGameStore.getState();
      if (s.track?.id !== id) return;
      s.setDetected(a ? { id, bpm: a.bpm, offset: a.offset, confidence: a.confidence } : null, analyzing);
    };
    return () => {
      music.onAnalysis = null;
    };
  }, []);

  // when a run ends: record it, rank it, and hand back a share code
  useEffect(
    () =>
      useGameStore.subscribe((s, prev) => {
        if (!(s.state === "dead" && prev.state === "playing")) return;
        const distance = s.score;
        // tell the room this racer is done so everyone's match overview updates
        if (multiplayer.inRoom) multiplayer.finish(distance);
        const levelId = s.levelId;
        const previousBest = prev.bestByLevel[levelId] ?? 0;
        const personalBest = distance > previousBest;
        const existing = s.myShareCodes[levelId] ?? null;
        if (distance < MIN_RANKED_DISTANCE) {
          s.setLastRun({ levelId, distance, shareCode: existing, rank: null, personalBest, status: "done" });
          return;
        }
        if (!personalBest) {
          s.setLastRun({ levelId, distance, shareCode: existing, rank: null, personalBest, status: "done" });
          return;
        }
        s.setLastRun({ levelId, distance, shareCode: existing, rank: null, personalBest, status: "saving" });
        submitRun({
          playerId: s.playerId,
          playerName: s.playerName,
          levelId,
          distance,
          trackTitle: s.track?.title ?? null,
          trackArtist: s.track?.artist ?? null,
        })
          .then(({ shareCode, rank }) => {
            const now = useGameStore.getState();
            now.setShareCode(levelId, shareCode);
            now.setLastRun({ levelId, distance, shareCode, rank, personalBest, status: "done" });
            void queryClient.invalidateQueries({ queryKey: ["leaderboard", levelId] });
          })
          .catch(() => {
            useGameStore
              .getState()
              .setLastRun({ levelId, distance, shareCode: existing, rank: null, personalBest, status: "error" });
          });
      }),
    [queryClient],
  );

  // live race: everyone starts together after a shared countdown
  useEffect(() => {
    multiplayer.onStart = ({ seed, levelId, at, track, tempo }) => {
      const store = useGameStore.getState();
      store.setLevel(levelId);
      if (track) {
        store.setTrack(track);
        store.setTempo(track.id, tempo ?? null);
      }
      const tick = () => {
        const left = Math.ceil((at - Date.now()) / 1000);
        if (left > 0) {
          store.setCountdown(left);
          setTimeout(tick, 200);
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
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
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
    <div className="fixed inset-0 bg-black font-body">
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
          gl={{ antialias: false, powerPreference: "high-performance" }}
        >
          <Scene />
        </Canvas>
      </div>
      <HUD onStart={() => start()} onStartRace={startRace} />
    </div>
  );
}
