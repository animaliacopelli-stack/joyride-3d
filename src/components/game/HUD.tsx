import { SKINS, useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";
import { multiplayer } from "@/game/multiplayer";
import { SongPanel } from "./SongPanel";
import { LevelSelect } from "./LevelSelect";
import { RacePanel } from "./RacePanel";

export function HUD({ onStart, onStartRace }: { onStart: () => void; onStartRace: () => void }) {
  const {
    state,
    score,
    best,
    attempts,
    skin,
    setSkin,
    musicOn,
    toggleMusic,
    track,
    levelId,
    roomCode,
    roster,
    countdown,
  } = useGameStore();
  const def = levelById(levelId);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* score bar */}
      <div className="flex items-start justify-between p-5">
        <div className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Distance</p>
          <p className="font-mono text-2xl font-bold text-white">{score} m</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-center backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Level</p>
          <p className="text-sm font-bold text-white">{def.name}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-right backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Best</p>
          <p className="font-mono text-2xl font-bold text-white">{best} m</p>
        </div>
      </div>

      {/* live standings */}
      {roomCode && state === "playing" && roster.length > 1 && (
        <div className="absolute left-5 top-28 space-y-1">
          {multiplayer
            .list()
            .slice(0, 5)
            .map((p) => (
              <p key={p.id} className="font-mono text-xs text-white/60">
                <span style={{ color: p.color }}>●</span> {p.name} {Math.round(p.dist)} m
              </p>
            ))}
        </div>
      )}

      {state === "playing" && track && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-xs text-white/50">
          ♪ {track.title} — {track.artist}
        </p>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="font-mono text-8xl font-black text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
            {countdown}
          </p>
        </div>
      )}

      {state !== "playing" && countdown === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-black/40 via-black/20 to-black/60 px-5 py-10">
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] sm:text-6xl">
              PRISM DASH
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {state === "dead"
                ? `Run over — ${score} m on attempt ${attempts}`
                : "The song builds the level. Jump the spikes, bounce the yellow rings."}
            </p>
          </div>

          <button
            onClick={onStart}
            className="pointer-events-auto rounded-full bg-white px-10 py-3 text-base font-bold text-black shadow-[0_10px_40px_rgba(255,255,255,0.25)] transition hover:scale-[1.03] active:scale-95"
          >
            {state === "dead" ? "Retry" : "Play"}
          </button>

          <LevelSelect />

          <div className="pointer-events-auto flex gap-2">
            {SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSkin(s.id);
                  multiplayer.updatePresence();
                }}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  skin === s.id
                    ? "border-white bg-white/20 text-white"
                    : "border-white/20 text-white/60 hover:border-white/50"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </button>
            ))}
          </div>

          <RacePanel onStartRace={onStartRace} />

          <SongPanel />

          <button
            onClick={toggleMusic}
            className="pointer-events-auto text-xs text-white/50 underline underline-offset-4 hover:text-white"
          >
            Music: {musicOn ? "on" : "off"}
          </button>

          <p className="text-[11px] text-white/40">Space / click / tap to jump · double jump in air</p>
        </div>
      )}
    </div>
  );
}
