import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Track } from "@/lib/music.functions";
import { ENDLESS_ID } from "./levels";

export type GameState = "menu" | "playing" | "dead";

export type SkinId = "smiley" | "cube" | "prism";

export const SKINS: { id: SkinId; label: string; color: string; accent: string }[] = [
  { id: "smiley", label: "Smiley", color: "#ffd23f", accent: "#ff8f1f" },
  { id: "cube", label: "Cube", color: "#4de1c1", accent: "#1a8f7a" },
  { id: "prism", label: "Prism", color: "#ff5f9e", accent: "#8a1e57" },
];

export type RoomPlayer = {
  id: string;
  name: string;
  skin: SkinId;
  best: number;
  alive: boolean;
};

export type TempoOverride = { bpm?: number | undefined; offset?: number | undefined };

export type LastRun = {
  levelId: string;
  distance: number;
  shareCode: string | null;
  rank: number | null;
  personalBest: boolean;
  status: "saving" | "done" | "error";
};

interface GameStore {
  state: GameState;
  score: number;
  best: number;
  attempts: number;
  skin: SkinId;
  levelId: string;
  bestByLevel: Record<string, number>;
  track: Track | null;
  musicOn: boolean;
  // tempo
  tempoByTrack: Record<string, TempoOverride>;
  detected: { id: string; bpm: number; offset: number; confidence: number } | null;
  analyzing: boolean;
  // identity + leaderboard
  playerId: string;
  playerName: string;
  myShareCodes: Record<string, string>;
  lastRun: LastRun | null;
  // multiplayer
  roomCode: string | null;
  roomStatus: "idle" | "joining" | "connected" | "error";
  roster: RoomPlayer[];
  countdown: number | null;
  start: () => void;
  die: () => void;
  toMenu: () => void;
  setScore: (n: number) => void;
  setSkin: (s: SkinId) => void;
  setLevel: (id: string) => void;
  setTrack: (t: Track | null) => void;
  toggleMusic: () => void;
  setTempo: (trackId: string, o: TempoOverride | null) => void;
  setDetected: (d: GameStore["detected"], analyzing: boolean) => void;
  setPlayerName: (n: string) => void;
  setLastRun: (r: LastRun | null) => void;
  setShareCode: (levelId: string, code: string) => void;
  setRoom: (code: string | null, status: GameStore["roomStatus"]) => void;
  setRoster: (r: RoomPlayer[]) => void;
  setCountdown: (n: number | null) => void;
}

function randomName() {
  const a = ["Neon", "Turbo", "Pixel", "Hyper", "Solar", "Astro", "Vivid", "Echo"];
  const b = ["Dasher", "Cube", "Prism", "Runner", "Jumper", "Spark"];
  return `${a[Math.floor(Math.random() * a.length)]} ${b[Math.floor(Math.random() * b.length)]}`;
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: "menu",
      score: 0,
      best: 0,
      attempts: 0,
      skin: "smiley",
      levelId: ENDLESS_ID,
      bestByLevel: {},
      track: null,
      musicOn: true,
      tempoByTrack: {},
      detected: null,
      analyzing: false,
      playerId: uuid(),
      playerName: randomName(),
      myShareCodes: {},
      lastRun: null,
      roomCode: null,
      roomStatus: "idle",
      roster: [],
      countdown: null,
      start: () => set((s) => ({ state: "playing", score: 0, attempts: s.attempts + 1, lastRun: null })),
      die: () =>
        set((s) => ({
          state: "dead",
          best: Math.max(s.best, s.score),
          bestByLevel: {
            ...s.bestByLevel,
            [s.levelId]: Math.max(s.bestByLevel[s.levelId] ?? 0, s.score),
          },
        })),
      toMenu: () => set({ state: "menu", score: 0 }),
      setScore: (n) => {
        if (get().score !== n) set({ score: n });
      },
      setSkin: (skin) => set({ skin }),
      setLevel: (levelId) => set({ levelId }),
      setTrack: (track) => set({ track, detected: null }),
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
      setTempo: (trackId, o) =>
        set((s) => {
          const next = { ...s.tempoByTrack };
          if (o && (o.bpm !== undefined || o.offset !== undefined)) next[trackId] = o;
          else delete next[trackId];
          return { tempoByTrack: next };
        }),
      setDetected: (detected, analyzing) => set({ detected, analyzing }),
      setPlayerName: (playerName) => set({ playerName }),
      setLastRun: (lastRun) => set({ lastRun }),
      setShareCode: (levelId, code) =>
        set((s) => ({ myShareCodes: { ...s.myShareCodes, [levelId]: code } })),
      setRoom: (roomCode, roomStatus) => set({ roomCode, roomStatus }),
      setRoster: (roster) => set({ roster }),
      setCountdown: (countdown) => set({ countdown }),
    }),
    {
      name: "prism-dash",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        best: s.best,
        bestByLevel: s.bestByLevel,
        skin: s.skin,
        levelId: s.levelId,
        musicOn: s.musicOn,
        tempoByTrack: s.tempoByTrack,
        playerId: s.playerId,
        playerName: s.playerName,
        myShareCodes: s.myShareCodes,
        track: s.track?.source === "apple" ? s.track : null,
      }),
    },
  ),
);

/** Effective tempo for the current track: manual override wins over detection. */
export function currentTempo() {
  const s = useGameStore.getState();
  const id = s.track?.id;
  const o = id ? s.tempoByTrack[id] : undefined;
  const d = s.detected && s.detected.id === id ? s.detected : null;
  return {
    bpm: o?.bpm ?? d?.bpm ?? null,
    offset: o?.offset ?? d?.offset ?? null,
    manual: !!o,
    detected: d,
  };
}
