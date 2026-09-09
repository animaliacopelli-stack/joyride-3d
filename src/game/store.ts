import { create } from "zustand";
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
  // multiplayer
  playerName: string;
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
  setPlayerName: (n: string) => void;
  setRoom: (code: string | null, status: GameStore["roomStatus"]) => void;
  setRoster: (r: RoomPlayer[]) => void;
  setCountdown: (n: number | null) => void;
}

function randomName() {
  const a = ["Neon", "Turbo", "Pixel", "Hyper", "Solar", "Astro", "Vivid", "Echo"];
  const b = ["Dasher", "Cube", "Prism", "Runner", "Jumper", "Spark"];
  return `${a[Math.floor(Math.random() * a.length)]} ${b[Math.floor(Math.random() * b.length)]}`;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: "menu",
  score: 0,
  best: 0,
  attempts: 0,
  skin: "smiley",
  levelId: ENDLESS_ID,
  bestByLevel: {},
  track: null,
  musicOn: true,
  playerName: randomName(),
  roomCode: null,
  roomStatus: "idle",
  roster: [],
  countdown: null,
  start: () => set((s) => ({ state: "playing", score: 0, attempts: s.attempts + 1 })),
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
  setTrack: (track) => set({ track }),
  toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
  setPlayerName: (playerName) => set({ playerName }),
  setRoom: (roomCode, roomStatus) => set({ roomCode, roomStatus }),
  setRoster: (roster) => set({ roster }),
  setCountdown: (countdown) => set({ countdown }),
}));
