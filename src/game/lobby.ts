import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore, skinById, type SkinId } from "./store";

export type LobbyPlayer = { name: string; skin: SkinId; color: string };
export type OpenRoom = {
  code: string;
  levelId: string;
  racing: boolean;
  players: LobbyPlayer[];
};

type Meta = { code: string; name: string; skin: SkinId; levelId: string; racing: boolean };

/**
 * A single shared presence channel that advertises every open race room.
 * Anyone sitting in a room shows up here, so the lobby can list rooms to join.
 */
class Lobby {
  private channel: RealtimeChannel | null = null;
  private id = Math.random().toString(36).slice(2, 10);
  private watchers = 0;
  private advertising: Meta | null = null;
  private listeners = new Set<(rooms: OpenRoom[]) => void>();
  private cache: OpenRoom[] = [];

  get rooms() {
    return this.cache;
  }

  /** Called by the lobby page while it is open. Returns a cleanup function. */
  watch(fn: (rooms: OpenRoom[]) => void) {
    this.listeners.add(fn);
    this.watchers++;
    void this.connect();
    fn(this.cache);
    return () => {
      this.listeners.delete(fn);
      this.watchers--;
      this.maybeDisconnect();
    };
  }

  /** Called when the player joins/leaves a room, so others can see it listed. */
  advertise(code: string | null, racing = false) {
    if (!code) {
      this.advertising = null;
      void this.channel?.untrack();
      this.maybeDisconnect();
      return;
    }
    const s = useGameStore.getState();
    this.advertising = {
      code,
      name: s.playerName || "Racer",
      skin: s.skin,
      levelId: s.levelId,
      racing,
    };
    void this.connect().then(() => {
      console.log("LOBBY advertise", JSON.stringify(this.advertising), !!this.channel);
      if (this.advertising) void this.channel?.track(this.advertising).then((r) => console.log("LOBBY track result", JSON.stringify(r)));
    });
  }

  private async connect() {
    console.log("LOBBY connect start");
    if (this.channel) return;
    const channel = supabase.channel("lobby", {
      config: { presence: { key: this.id } },
    });
    this.channel = channel;
    channel.on("presence", { event: "sync" }, () => this.sync(channel));
    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        console.log("LOBBY status", status);
        if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") resolve();
      });
    });
    if (this.advertising) void channel.track(this.advertising);
  }

  private sync(channel: RealtimeChannel) {
    const state = channel.presenceState<Meta>();
    const byCode = new Map<string, OpenRoom>();
    for (const metas of Object.values(state)) {
      const m = metas[0];
      if (!m?.code) continue;
      const room =
        byCode.get(m.code) ??
        byCode.set(m.code, { code: m.code, levelId: m.levelId, racing: false, players: [] }).get(m.code)!;
      room.racing = room.racing || !!m.racing;
      room.players.push({ name: m.name || "Racer", skin: m.skin, color: skinById(m.skin).color });
    }
    console.log("LOBBY sync", JSON.stringify(state));
    this.cache = [...byCode.values()].sort((a, b) => b.players.length - a.players.length);
    for (const fn of this.listeners) fn(this.cache);
  }

  private maybeDisconnect() {
    if (this.watchers > 0 || this.advertising) return;
    const ch = this.channel;
    this.channel = null;
    this.cache = [];
    if (ch) void supabase.removeChannel(ch);
  }
}

export const lobby = new Lobby();
