import { create } from "zustand";
import type { Track } from "@/lib/music.functions";

export type GameState = "menu" | "playing" | "dead";

export type SkinId = "smiley" | "cube" | "prism";

export const SKINS: { id: SkinId; label: string; color: string; accent: string }[] = [
  { id: "smiley", label: "Smiley", color: "#ffd23f", accent: "#ff8f1f" },
  { id: "cube", label: "Cube", color: "#4de1c1", accent: "#1a8f7a" },
  { id: "prism", label: "Prism", color: "#ff5f9e", accent: "#8a1e57" },
];

interface GameStore {
  state: GameState;
  score: number;
  best: number;
  attempts: number;
  skin: SkinId;
  track: Track | null;
  musicOn: boolean;
  start: () => void;
  die: () => void;
  toMenu: () => void;
  setScore: (n: number) => void;
  setSkin: (s: SkinId) => void;
  setTrack: (t: Track | null) => void;
  toggleMusic: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: "menu",
  score: 0,
  best: 0,
  attempts: 0,
  skin: "smiley",
  track: null,
  musicOn: true,
  start: () => set((s) => ({ state: "playing", score: 0, attempts: s.attempts + 1 })),
  die: () => set((s) => ({ state: "dead", best: Math.max(s.best, s.score) })),
  toMenu: () => set({ state: "menu", score: 0 }),
  setScore: (n) => {
    if (get().score !== n) set({ score: n });
  },
  setSkin: (skin) => set({ skin }),
  setTrack: (track) => set({ track }),
  toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
}));
