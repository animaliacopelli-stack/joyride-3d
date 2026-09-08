export type ObstacleType = "spike" | "block";

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
  jumps = 0; // NEW: Tracks how many times we've jumped in the air
  groundHeight = 0;
  rotation = 0;
  distance = 0;
  speed = 17;
  jumpQueued = false;
  cursor = 40;
  rng = mulberry32(1);
  shake = 0;

  // Make the seed optional. If no seed is provided, use Date.now() for total randomness!
  reset(seed?: number) {
    this.obstacles = [];
    this.playerY = 0.6;
    this.playerVy = 0;
    this.grounded = true;
    this.jumps = 0; // Reset jumps
    this.groundHeight = 0;
    this.rotation = 0;
    this.distance = 0;
    this.speed = 17;
    this.jumpQueued = false;
    this.cursor = 32;
    this.shake = 0;
    // This makes the level generation completely random every run!
    this.rng = mulberry32(seed ?? Date.now()); 
  }

  populate(intensity: number) {
    while (this.cursor < 190) {
      const r = this.rng();
      
      // PROGRESSIVE DIFFICULTY: distanceScale goes up endlessly as you run
      const distanceScale = this.distance / 3000; 
      const diff = Math.min(1, distanceScale) * 0.4 + intensity * 0.6;
      
      // Gaps shrink based on both the music drop AND how far you've survived
      const gap = Math.max(8, 24 - (intensity * 12) - (distanceScale * 6));

      // NEW OBSTACLE: The "Double Jump Wall"
      // Only spawns once the game starts getting harder (diff > 0.3)
      if (r < 0.15 && diff > 0.3) {
        // Height is 4.5! You MUST double jump to clear this
        this.obstacles.push({ x: this.cursor, type: "block", w: 2.5, h: 4.5 });
        this.cursor += gap + 5;
      } 
      // Regular Spikes
      else if (r < 0.5) {
        const count = 1 + Math.floor(this.rng() * (diff > 0.5 ? 4 : 2));
        for (let i = 0; i < count; i++) {
          this.obstacles.push({ x: this.cursor + i * 1.5, type: "spike", w: 1.2, h: 1.5 });
        }
        this.cursor += gap + count * 1.4;
      } 
      // Regular Blocks
      else {
        const h = 1.6 + Math.round(this.rng() * 1) * 0.9;
        this.obstacles.push({ x: this.cursor, type: "block", w: 3.2, h });
        if (this.rng() < diff) {
          this.obstacles.push({ x: this.cursor + 3.4, type: "spike", w: 1.2, h: 1.5 });
        }
        this.cursor += gap + 4;
      }
    }
  }

  advance(dx: number) {
    this.distance += dx;
    this.cursor -= dx;
    for (const o of this.obstacles) o.x -= dx;
    if (this.obstacles.length && this.obstacles[0]!.x < -25) {
      this.obstacles = this.obstacles.filter((o) => o.x > -25);
    }
  }
}
