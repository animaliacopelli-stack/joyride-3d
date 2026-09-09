import { useState } from "react";
import { multiplayer, randomRoomCode } from "@/game/multiplayer";
import { useGameStore } from "@/game/store";

export function RacePanel({ onStartRace }: { onStartRace: () => void }) {
  const { roomCode, roomStatus, roster, playerName, setPlayerName } = useGameStore();
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);

  if (!open && !roomCode) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto rounded-full border border-white/25 px-5 py-2 text-xs font-semibold text-white/80 transition hover:border-white hover:text-white"
      >
        Race a friend
      </button>
    );
  }

  return (
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/15 bg-black/50 p-4 backdrop-blur-md">
      {!roomCode ? (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Live race</p>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
            placeholder="Your name"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/50"
          />
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="ROOM CODE"
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm tracking-[0.2em] text-white outline-none placeholder:text-white/30 focus:border-white/50"
            />
            <button
              disabled={code.length < 4}
              onClick={() => void multiplayer.join(code)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
            >
              Join
            </button>
          </div>
          <button
            onClick={() => void multiplayer.join(randomRoomCode())}
            className="w-full rounded-lg border border-white/20 py-2 text-sm font-semibold text-white/80 hover:border-white hover:text-white"
          >
            Create a room
          </button>
          <button onClick={() => setOpen(false)} className="text-[11px] text-white/40 underline">
            Close
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">Room code</p>
              <p className="font-mono text-2xl font-bold tracking-[0.3em] text-white">{roomCode}</p>
            </div>
            <span className="text-[11px] text-white/50">
              {roomStatus === "connected" ? `${roster.length} in room` : roomStatus}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {roster.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75"
              >
                {p.name}
                {p.id === multiplayer.myId ? " (you)" : ""}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onStartRace}
              className="flex-1 rounded-lg bg-white py-2 text-sm font-bold text-black"
            >
              Start race for everyone
            </button>
            <button
              onClick={() => void multiplayer.leave()}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white"
            >
              Leave
            </button>
          </div>
          <p className="text-[11px] text-white/40">
            Share the code. Everyone runs the same level and sees each other on the track.
          </p>
        </div>
      )}
    </div>
  );
}
