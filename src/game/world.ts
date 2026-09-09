export type ObstacleType = "spike" | "block" | "orb";

export type Obstacle = {
  x: number;
  type: ObstacleType;
  w: number;
  h: number;
};

export type Theme = {
  name: string;
  bg: string;
  fog: string;
  ground: string;
  grid: string;
  spike: string;
  block: string;
  light: string;
};

export const THEMES: Theme[] = [
  {
    name: "Neon Bay",
    bg: "#10143a",
    fog: "#1a2060",
    ground: "#232a72",
    grid: "#6ae1ff",
    spike: "#ff4d6d",
    block: "#7c5cff",
    light: "#bcd8ff",
  },
  {
    name: "Sunset Circuit",
    bg: "#2b1030",
    fog: "#5a1f45",
    ground: "#4a1c46",
    grid: "#ffb45c",
    spike: "#ff6a3d",
    block: "#ffd166",
    light: "#ffe4c0",
  },
  {
    name: "Emerald Grid",
    bg: "#04231f",
    fog: "#0b4038",
    ground: "#0d4c40",
    grid: "#5cffc8",
    spike: "#ff5fa2",
    block: "#37d67a",
    light: "#d3fff2",
  },
  {
    name: "Ice Vault",
    bg: "#0a1a2f",
    fog: "#13375c",
    ground: "#183f66",
    grid: "#9fe8ff",
    spike: "#ff8ba0",
    block: "#63b3ff",
    light: "#e6f7ff",
  },
];

export type WorldConfig = {
  baseSpeed: number;
  maxSpeed: number;
  /** 0..1 — how tightly packed the obstacles are. */
  density: number;
  /** metres of distance needed to gain 1 unit of speed. */
  ramp: number;
};

export const DEFAULT_CONFIG: WorldConfig = {
  baseSpeed: 16,
  maxSpeed: 34,
  density: 0.5,
  ramp: 150,
};

/** How far ahead of the player new obstacles appear. */
const SPAWN_X = 84;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class World {
  obstacles: Obstacle[] = [];
  playerY = 0.6;
  playerVy = 0;
  grounded = true;
  jumps = 0;
  groundHeight = 0;
  rotation = 0;
  distance = 0;
  speed = 16;
  jumpQueued = false;
  rng = mulberry32(1);
  shake = 0;
  cfg: WorldConfig = { ...DEFAULT_CONFIG };
  lastSpawnDist = -40;

  reset(seed?: number, cfg?: Partial<WorldConfig>) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.obstacles = [];
    this.playerY = 0.6;
    this.playerVy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.groundHeight = 0;
    this.rotation = 0;
    this.distance = 0;
    this.speed = this.cfg.baseSpeed;
    this.jumpQueued = false;
    this.shake = 0;
    this.lastSpawnDist = -30;
    this.rng = mulberry32(seed ?? Date.now());
  }

  /** One simulation step. `intensity` is 0..1 song loudness, `beat` fires on each detected beat. */
  step(delta: number, intensity: number, beat: boolean) {
    this.speed = Math.min(this.cfg.maxSpeed, this.cfg.baseSpeed + this.distance / this.cfg.ramp);
    this.advance(this.speed * delta);
    this.maybeSpawn(intensity, beat);
  }

  /** Obstacles are placed on the beat of the song, never on a fixed grid. */
  maybeSpawn(intensity: number, beat: boolean) {
    const since = this.distance - this.lastSpawnDist;
    // Faster runs need more room between hazards so they stay clearable.
    const minGap = Math.max(7, this.speed * (0.58 - this.cfg.density * 0.16));
    const forced = since > minGap * 3.4; // keeps the level alive during quiet passages
    if (!forced && (!beat || since < minGap)) return;
    this.lastSpawnDist = this.distance;
    this.spawn(intensity);
  }

  private spawn(intensity: number) {
    const progress = Math.min(1, this.distance / 2600);
    const heat = Math.min(1, intensity * 0.65 + progress * 0.35 + this.cfg.density * 0.25);
    const r = this.rng();

    if (r < 0.16 && heat > 0.25) {
      // Yellow ring: bounce pad in the air, with a hazard right after it.
      this.obstacles.push({ x: SPAWN_X, type: "orb", w: 1.2, h: 3.3 });
      const n = 1 + Math.floor(this.rng() * (heat > 0.6 ? 3 : 2));
      for (let i = 0; i < n; i++) {
        this.obstacles.push({ x: SPAWN_X + 5.5 + i * 1.5, type: "spike", w: 1.2, h: 1.5 });
      }
      return;
    }

    if (r < 0.3 && heat > 0.35) {
      // Tall wall — needs a double jump or an orb boost.
      this.obstacles.push({ x: SPAWN_X, type: "block", w: 2.5, h: 3.6 + heat * 1.4 });
      return;
    }

    if (r < 0.62) {
      const count = 1 + Math.floor(this.rng() * (heat > 0.55 ? 4 : 2));
      for (let i = 0; i < count; i++) {
        this.obstacles.push({ x: SPAWN_X + i * 1.5, type: "spike", w: 1.2, h: 1.5 });
      }
      return;
    }

    // Staircase / platform run.
    const stairs = Math.floor(this.rng() * 3);
    for (let i = 0; i <= stairs; i++) {
      this.obstacles.push({ x: SPAWN_X + i * 3.1, type: "block", w: 3.2, h: 1.6 + i * 0.8 });
    }
  }

  advance(dx: number) {
    this.distance += dx;
    for (const o of this.obstacles) o.x -= dx;
    if (this.obstacles.length && this.obstacles[0]!.x < -25) {
      this.obstacles = this.obstacles.filter((o) => o.x > -25);
    }
  }
}

export const world = new World();
