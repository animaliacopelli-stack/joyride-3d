import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/lib/music.functions";
import { useGameStore, skinById, type SkinId, type TempoOverride } from "./store";

export type Peer = {
  id: string;
  name: string;
  skin: SkinId;
  color: string;
  y: number;
  dist: number;
  alive: boolean;
  t: number;
  /** metres per second, derived from the last two packets (for smooth prediction) */
  vd: number;
};

export type RaceStart = {
  seed: number;
  levelId: string;
  at: number;
  /** host's song so everyone hears (and jumps to) the same beat */
  track?: Track | null;
  tempo?: TempoOverride | null;
};




export type Standing = {
  id: string;
  name: string;
  color: string;
  dist: number;
  finished: boolean;
  me: boolean;
};

class Multiplayer {
  private channel: RealtimeChannel | null = null;
  private id = Math.random().toString(36).slice(2, 10);
  private lastSent = 0;
  peers = new Map<string, Peer>();
  /** last race's result per racer — kept after death so everyone sees the match overview */
  results = new Map<string, { name: string; color: string; dist: number; finished: boolean }>();
  raceActive = false;
  onStart: ((s: RaceStart) => void) | null = null;

  private record(id: string, name: string, color: string, dist: number, finished: boolean) {
    const prev = this.results.get(id);
    this.results.set(id, {
      name,
      color,
      dist: Math.max(prev?.dist ?? 0, dist),
      finished: finished || (prev?.finished ?? false),
    });
  }

  /** Everyone's standings for the current/last race, best distance first. */
  standings(): Standing[] {
    const s = useGameStore.getState();
    const out: Standing[] = [];
    for (const [id, r] of this.results) out.push({ id, ...r, me: id === this.id });
    if (!this.results.has(this.id))
      out.push({
        id: this.id,
        name: s.playerName || "You",
        color: skinById(s.skin).color,
        dist: s.score,
        finished: s.state !== "playing",
        me: true,
      });
    return out.sort((a, b) => b.dist - a.dist);
  }

  /** Broadcast the final distance so the whole room can rank the match. */
  finish(dist: number) {
    const s = useGameStore.getState();
    this.record(this.id, s.playerName || "You", skinById(s.skin).color, dist, true);
    if (!this.channel) return;
    void this.channel.send({
      type: "broadcast",
      event: "fin",
      payload: { id: this.id, name: s.playerName || "Racer", skin: s.skin, dist },
    });
  }

  get myId() {
    return this.id;
  }
  get inRoom() {
    return this.channel !== null;
  }

  async join(code: string) {
    await this.leave();
    const store = useGameStore.getState();
    store.setRoom(code, "joining");

    const channel = supabase.channel(`race:${code}`, {
      config: { broadcast: { self: false }, presence: { key: this.id } },
    });
    this.channel = channel;

    channel.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as Peer;
      if (!p?.id || p.id === this.id) return;
      const now = performance.now();
      const prev = this.peers.get(p.id);
      const dt = prev ? (now - prev.t) / 1000 : 0;
      const vd = prev && dt > 0.01 && dt < 0.6 ? Math.max(-60, Math.min(60, (p.dist - prev.dist) / dt)) : (prev?.vd ?? 0);
      this.peers.set(p.id, { ...p, color: skinById(p.skin).color, t: now, vd });
      this.record(p.id, p.name, skinById(p.skin).color, p.dist, !p.alive);
    });

    channel.on("broadcast", { event: "fin" }, ({ payload }) => {
      const p = payload as { id: string; name: string; skin: SkinId; dist: number };
      if (!p?.id || p.id === this.id) return;
      this.record(p.id, p.name, skinById(p.skin).color, p.dist, true);
    });

    channel.on("broadcast", { event: "start" }, ({ payload }) => {
      this.results.clear();
      this.raceActive = true;
      this.onStart?.(payload as RaceStart);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string; skin: SkinId; best: number }>();
      const roster = Object.entries(state).map(([key, metas]) => {
        const m = metas[0]!;
        return {
          id: key,
          name: m.name ?? "Racer",
          skin: (m.skin ?? "verity") as SkinId,
          best: m.best ?? 0,
          alive: true,
        };
      });
      useGameStore.getState().setRoster(roster);
      for (const id of [...this.peers.keys()]) if (!state[id]) this.peers.delete(id);
    });

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          const s = useGameStore.getState();
          void channel.track({ name: s.playerName, skin: s.skin, best: s.best });
          s.setRoom(code, "connected");
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          useGameStore.getState().setRoom(code, "error");
          resolve();
        }
      });
    });
  }

  updatePresence() {
    if (!this.channel) return;
    const s = useGameStore.getState();
    void this.channel.track({ name: s.playerName, skin: s.skin, best: s.best });
  }

  /** Throttled position broadcast (about 25/s). */
  send(dist: number, y: number, alive: boolean) {
    if (!this.channel) return;
    const now = performance.now();
    if (now - this.lastSent < 40) return;
    this.lastSent = now;
    const s = useGameStore.getState();
    void this.channel.send({
      type: "broadcast",
      event: "pos",
      payload: {
        id: this.id,
        name: s.playerName,
        skin: s.skin,
        dist: Math.round(dist * 10) / 10,
        y: Math.round(y * 100) / 100,
        alive,
      },
    });
  }

  startRace(seed: number, levelId: string) {
    const s = useGameStore.getState();
    // local uploads can't be shared, so only Apple tracks travel with the race
    const track = s.track && s.track.source === "apple" ? s.track : null;
    const tempo = track ? (s.tempoByTrack[track.id] ?? null) : null;
    const payload: RaceStart = { seed, levelId, at: Date.now() + 3500, track, tempo };
    this.results.clear();
    this.raceActive = true;
    void this.channel?.send({ type: "broadcast", event: "start", payload });
    this.onStart?.(payload);
  }

  list(): Peer[] {
    const now = performance.now();
    const out: Peer[] = [];
    for (const [id, p] of this.peers) {
      if (now - p.t > 4000) this.peers.delete(id);
      else out.push(p);
    }
    return out;
  }

  async leave() {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.peers.clear();
    const s = useGameStore.getState();
    s.setRoster([]);
    s.setRoom(null, "idle");
  }
}

export const multiplayer = new Multiplayer();

export function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function seedFromCode(code: string) {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
