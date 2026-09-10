import { useState } from "react";
import { Users, Copy, Check } from "lucide-react";
import { multiplayer, randomRoomCode } from "@/game/multiplayer";
import { useGameStore, SKINS, skinById } from "@/game/store";
import { Panel, Pill, Field } from "./ui";

export function RacePanel({ onStartRace }: { onStartRace: () => void }) {
  const { roomCode, roomStatus, roster, playerName, setPlayerName, track } = useGameStore();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Panel title="Race a friend" icon={<Users className="h-3.5 w-3.5" />}>
      {!roomCode ? (
        <div className="space-y-2.5">
          <Field
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value.slice(0, 16));
            }}
            onBlur={() => multiplayer.updatePresence()}
            placeholder="Your name"
            className="w-full"
          />
          <div className="flex gap-2">
            <Field
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder="ROOM CODE"
              className="flex-1 font-mono tracking-[0.25em]"
            />
            <button
              disabled={code.length < 4 || roomStatus === "joining"}
              onClick={() => void multiplayer.join(code)}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-bold text-ink-inverse disabled:opacity-40"
            >
              Join
            </button>
          </div>
          <button
            onClick={() => void multiplayer.join(randomRoomCode())}
            disabled={roomStatus === "joining"}
            className="w-full rounded-lg border border-glass-border py-2 text-sm font-semibold text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-40"
          >
            {roomStatus === "joining" ? "Connecting…" : "Create a room"}
          </button>
          {roomStatus === "error" && (
            <p className="text-[11px] text-destructive">Couldn't reach the room. Try again in a moment.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Room code</p>
              <button onClick={() => void copy()} className="flex items-center gap-2 font-display text-2xl font-black tracking-[0.3em] text-ink">
                {roomCode}
                {copied ? <Check className="h-4 w-4 text-neon" /> : <Copy className="h-4 w-4 text-ink-faint" />}
              </button>
            </div>
            <span className="text-[11px] text-ink-muted">
              {roomStatus === "connected" ? `${roster.length} in room` : roomStatus}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {roster.map((p) => {
              const color = skinById(p.skin).color;
              return (
                <Pill key={p.id} active={p.id === multiplayer.myId} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {p.name}
                  {p.id === multiplayer.myId ? " (you)" : ""}
                </Pill>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onStartRace}
              className="flex-1 rounded-lg bg-ink py-2 text-sm font-bold text-ink-inverse transition hover:opacity-90"
            >
              Start race for everyone
            </button>
            <button
              onClick={() => void multiplayer.leave()}
              className="rounded-lg border border-glass-border px-4 py-2 text-sm text-ink-muted transition hover:border-ink hover:text-ink"
            >
              Leave
            </button>
          </div>
          <p className="text-[11px] leading-snug text-ink-faint">
            Everyone gets the same level, the same obstacles and — {track?.source === "local" ? "since your song is a local file, the level's own beat" : "your song"}. You'll see each other as glowing ghosts on the track.
          </p>
        </div>
      )}
    </Panel>
  );
}
