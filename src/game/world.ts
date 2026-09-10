import type { BeatGrid } from "./beats";

export type ObstacleType = "spike" | "block" | "orb";

export type Obstacle = {
  /** current x relative to the player (recomputed every frame from `t`) */
  x: number;
  type: ObstacleType;
  w: number;
  h: number;
  /** song time at which this obstacle reaches the player */
  t: number;
  /** extra x offset inside a cluster (spike rows, staircases) */
  dx: number;
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
    bg: "#0b0f33",
    fog: "#161c5c",
    ground: "#1d2468",
    grid: "#6ae1ff",
    spike: "#ff4d6d",
    block: "#7c5cff",
    light: "#bcd8ff",
  },
  {
    name: "Sunset Circuit",
    bg: "#240c2c",
    fog: "#521a40",
    ground: "#431842",
    grid: "#ffb45c",
    spike: "#ff6a3d",
    block: "#ffd166",
    light: "#ffe4c0",
  },
  {
    name: "Emerald Grid",
    bg: "#031d1a",
    fog: "#0a3b33",
    ground: "#0c473c",
    grid: "#5cffc8",
    spike: "#ff5fa2",
    block: "#37d67a",
    light: "#d3fff2",
  },
  {
    name: "Ice Vault",
    bg: "#08152a",
    fog: "#113256",
    ground: "#163a5f",
    grid: "#9fe8ff",
    spike: "#ff8ba0",
    block: "#63b3ff",
    light: "#e6f7ff",
  },
];

export type WorldConfig = {
  baseSpeed: number;
  maxSpeed: number;
  /** 0..1 — how many beats get a hazard and how tight the gaps are. */
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

/** Physics shared by the player and the level generator. */
export const GRAVITY = -60;
export const JUMP_V = 21;
export const PLAYER_RADIUS = 0.62;

/** How far ahead of the player obstacles become visible. */
export const SPAWN_X = 84;
const MENU_SPEED = 7;

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
  playerY = PLAYER_RADIUS;
  playerVy = 0;
  grounded = true;
  jumps = 0;
  rotation = 0;
  distance = 0;
  speed = 16;
  jumpQueued = false;
  rng = mulberry32(1);
  shake = 0;
  cfg: WorldConfig = { ...DEFAULT_CONFIG };
  mode: "menu" | "run" = "menu";
  /** Continuous song clock (seconds). Locks onto the audio when it plays. */
  clock = 0;
  /** clock value of the most recent death / orb bounce (for effects) */
  deathAt = -10;
  deathY = PLAYER_RADIUS;
  orbAt = -10;
  orbY = 0;

  private nextBeat = 0;
  private hazardUntil = -10;

  reset(seed?: number, cfg?: Partial<WorldConfig>, mode: "menu" | "run" = "run") {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.obstacles = [];
    this.playerY = PLAYER_RADIUS;
    this.playerVy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.rotation = 0;
    this.distance = 0;
    this.speed = mode === "menu" ? MENU_SPEED : this.cfg.baseSpeed;
    this.jumpQueued = false;
    this.shake = 0;
    this.mode = mode;
    this.clock = 0;
    this.deathAt = -10;
    this.orbAt = -10;
    this.nextBeat = 0;
    this.hazardUntil = -10;
    this.rng = mulberry32(seed ?? Date.now());
  }

  speedAt(d: number) {
    if (this.mode === "menu") return MENU_SPEED;
    return Math.min(this.cfg.maxSpeed, this.cfg.baseSpeed + d / this.cfg.ramp);
  }

  /**
   * Advance the song clock by a frame. When the audio reports its own time we
   * ease onto it, so obstacles stay glued to the track without jittering.
   */
  sync(delta: number, audioTime: number | null) {
    this.clock += delta;
    if (audioTime !== null) {
      const err = audioTime - this.clock;
      if (Math.abs(err) > 0.35) this.clock = audioTime;
      else this.clock += err * Math.min(1, delta * 5);
    }
    return this.clock;
  }

  /** One simulation step at song time `now` with beat timeline `grid`. */
  step(delta: number, now: number, grid: BeatGrid) {
    this.speed = this.speedAt(this.distance);
    this.distance += this.speed * delta;
    this.schedule(now, grid);
    this.place(now);
  }

  /** Distance the player will cover in the next `tau` seconds (negative = behind). */
  timeToDist(tau: number) {
    if (tau <= 0) return this.speed * tau;
    if (this.mode === "menu") return MENU_SPEED * tau;
    const steps = 8;
    const dt = tau / steps;
    let d = 0;
    for (let i = 0; i < steps; i++) d += this.speedAt(this.distance + d) * dt;
    return d;
  }

  /** Recompute every obstacle's x from its beat time, then drop the ones far behind. */
  private place(now: number) {
    let prune = false;
    for (const o of this.obstacles) {
      o.x = this.timeToDist(o.t - now) + o.dx;
      if (o.x < -30) prune = true;
    }
    if (prune) this.obstacles = this.obstacles.filter((o) => o.x >= -30);
  }

  private beatsPerLoop(grid: BeatGrid) {
    const period = 60 / grid.bpm;
    return Math.max(1, Math.floor((grid.duration - grid.offset) / period) + 1);
  }

  beatTime(k: number, grid: BeatGrid) {
    const period = 60 / grid.bpm;
    const bpl = this.beatsPerLoop(grid);
    const loop = Math.floor(k / bpl);
    const j = k - loop * bpl;
    return loop * grid.duration + grid.offset + j * period;
  }

  /** 0..1 how far we are through the current beat (0 = on the beat). */
  beatPhase(now: number, grid: BeatGrid) {
    const period = 60 / grid.bpm;
    const local = ((now % grid.duration) + grid.duration) % grid.duration;
    const p = (((local - grid.offset) % period) + period) % period;
    return p / period;
  }

  private schedule(now: number, grid: BeatGrid) {
    const bpl = this.beatsPerLoop(grid);
    // beats that are already too close to react to are skipped
    while (this.beatTime(this.nextBeat, grid) < now + 0.45) this.nextBeat++;

    for (let guard = 0; guard < 64; guard++) {
      const k = this.nextBeat;
      const t = this.beatTime(k, grid);
      const x = this.timeToDist(t - now);
      if (x > SPAWN_X) break;
      this.nextBeat++;
      this.consider(k, t, x, grid, bpl);
    }
  }

  private consider(k: number, t: number, x: number, grid: BeatGrid, bpl: number) {
    const r = this.rng();
    const r2 = this.rng();
    if (t < this.hazardUntil) return;

    const energy = grid.energyAt(t);
    const density = this.mode === "menu" ? 0.25 : this.cfg.density;
    const downbeat = (k % bpl) % 4 === 0;
    let chance = 0.3 + density * 0.55 + energy * 0.3 + (downbeat ? 0.3 : 0);
    if (this.mode === "run" && this.distance + x < 45) chance = 0; // breathing room at the start
    if (r2 > chance) return;

    const progress = Math.min(1, this.distance / 2600);
    const heat = Math.min(1, energy * 0.5 + progress * 0.3 + density * 0.35);
    const speedThere = this.speedAt(this.distance + x);
    const gapSec = Math.max(0.42, 0.8 - density * 0.34);
    let width = 1.2;
    let endT = t;

    if (r < 0.15 && heat > 0.3) {
      // Yellow ring on this beat, hazard exactly on the next beat.
      const tNext = this.beatTime(k + 1, grid);
      this.obstacles.push({ x, type: "orb", w: 1.2, h: 3.3, t, dx: 0 });
      const n = 1 + Math.floor(this.rng() * (heat > 0.6 ? 3 : 2));
      for (let i = 0; i < n; i++) {
        this.obstacles.push({ x, type: "spike", w: 1.2, h: 1.5, t: tNext, dx: i * 1.5 });
      }
      width = n * 1.5;
      endT = tNext;
      this.nextBeat = Math.max(this.nextBeat, k + 2);
    } else if (r < 0.28 && heat > 0.4) {
      // Tall wall — needs a double jump or an orb boost.
      this.obstacles.push({ x, type: "block", w: 2.5, h: 3.6 + heat * 1.2, t, dx: 0 });
      width = 2.5;
    } else if (r < 0.64) {
      const count = 1 + Math.floor(this.rng() * (heat > 0.55 ? 3 : 2));
      for (let i = 0; i < count; i++) {
        this.obstacles.push({ x, type: "spike", w: 1.2, h: 1.5, t, dx: i * 1.5 });
      }
      width = count * 1.5;
    } else {
      // Staircase / platform run.
      const stairs = Math.floor(this.rng() * 3);
      for (let i = 0; i <= stairs; i++) {
        this.obstacles.push({ x, type: "block", w: 3.2, h: 1.6 + i * 0.8, t, dx: i * 3.1 });
      }
      width = (stairs + 1) * 3.1;
    }

    this.hazardUntil = endT + width / speedThere + gapSec;
  }
}

export const world = new World();
