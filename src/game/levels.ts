import type { WorldConfig } from "./world";

export type LevelDef = {
  id: string;
  name: string;
  subtitle: string;
  themeIndex: number;
  /** true = the theme rotates as you survive. */
  rotateTheme: boolean;
  difficulty: "Easy" | "Normal" | "Hard" | "Insane";
  seed: number;
  /** tempo used when no song is playing */
  bpm: number;
  config: WorldConfig;
};

export const LEVELS: LevelDef[] = [
  {
    id: "neon-bay",
    name: "Neon Bay",
    subtitle: "A gentle warm-up on the water",
    themeIndex: 0,
    rotateTheme: false,
    difficulty: "Easy",
    seed: 1011,
    bpm: 104,
    config: { baseSpeed: 14, maxSpeed: 22, density: 0.25, ramp: 220 },
  },
  {
    id: "sunset-circuit",
    name: "Sunset Circuit",
    subtitle: "Tighter gaps, bouncier beat",
    themeIndex: 1,
    rotateTheme: false,
    difficulty: "Normal",
    seed: 2022,
    bpm: 122,
    config: { baseSpeed: 17, maxSpeed: 28, density: 0.5, ramp: 170 },
  },
  {
    id: "emerald-grid",
    name: "Emerald Grid",
    subtitle: "Orb chains and tall walls",
    themeIndex: 2,
    rotateTheme: false,
    difficulty: "Hard",
    seed: 3033,
    bpm: 136,
    config: { baseSpeed: 20, maxSpeed: 33, density: 0.72, ramp: 140 },
  },
  {
    id: "ice-vault",
    name: "Ice Vault",
    subtitle: "Full speed, no mercy",
    themeIndex: 3,
    rotateTheme: false,
    difficulty: "Insane",
    seed: 4044,
    bpm: 150,
    config: { baseSpeed: 23, maxSpeed: 40, density: 0.9, ramp: 110 },
  },
  {
    id: "endless",
    name: "Endless",
    subtitle: "Runs forever, keeps speeding up",
    themeIndex: 0,
    rotateTheme: true,
    difficulty: "Normal",
    seed: 0,
    bpm: 128,
    config: { baseSpeed: 16, maxSpeed: 42, density: 0.55, ramp: 150 },
  },
];

export const ENDLESS_ID = "endless";

export function levelById(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0]!;
}
