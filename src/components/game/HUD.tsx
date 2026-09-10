import { useState } from "react";
import { Share2, Check, Loader2, Volume2, VolumeX } from "lucide-react";
import { SKINS, useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";
import { multiplayer } from "@/game/multiplayer";
import { shareRun } from "@/lib/leaderboard";
import { SongPanel } from "./SongPanel";
import { LevelSelect } from "./LevelSelect";
import { RacePanel } from "./RacePanel";
import { TempoPanel } from "./TempoPanel";
import { Leaderboard } from "./Leaderboard";
import { Pill } from "./ui";

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
    lastRun,
    bestByLevel,
  } = useGameStore();
  const def = levelById(levelId);
  const [shared, setShared] = useState(false);

  const share = async () => {
    if (!lastRun?.shareCode) return;
    const r = await shareRun({ code: lastRun.shareCode, distance: lastRun.distance, levelName: def.name });
    if (r !== "failed") {
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none text-ink">
      {/* score bar */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <Stat label="Distance" value={`${score} m`} />
        <div className="rounded-xl border border-glass-border bg-glass px-4 py-2 text-center backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ink-faint">Level</p>
          <p className="font-display text-sm font-extrabold">{def.name}</p>
        </div>
        <Stat label="Best" value={`${bestByLevel[levelId] ?? best} m`} align="right" />
      </div>

      {/* live standings */}
      {roomCode && state === "playing" && roster.length > 1 && (
        <div className="absolute left-5 top-28 space-y-1 rounded-xl border border-glass-border bg-glass px-3 py-2 backdrop-blur-md">
          {multiplayer
            .list()
            .slice(0, 5)
            .map((p) => (
              <p key={p.id} className="font-mono text-xs text-ink-muted">
                <span style={{ color: p.color }}>●</span> {p.name} {Math.round(p.dist)} m
              </p>
            ))}
        </div>
      )}

      {state === "playing" && track && (
        <p className="absolute bottom-5 left-0 right-0 text-center text-xs text-ink-muted">
          ♪ {track.title} — {track.artist}
        </p>
      )}

      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
          <p className="font-display text-[8rem] font-black leading-none drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] animate-beat" key={countdown}>
            {countdown}
          </p>
          <p className="text-sm text-ink-muted">Everyone starts together</p>
        </div>
      )}

      {state !== "playing" && countdown === null && (
        <div className="pointer-events-auto absolute inset-0 overflow-y-auto bg-gradient-to-b from-black/50 via-black/25 to-black/70">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 pt-24 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-28">
            {/* left column */}
            <div className="space-y-5 animate-rise">
              <div>
                <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight drop-shadow-[0_6px_30px_rgba(0,0,0,0.6)] sm:text-7xl">
                  PRISM
                  <br />
                  <span className="text-neon">DASH</span>
                </h1>
                <p className="mt-3 max-w-md text-sm text-ink-muted">
                  {state === "dead"
                    ? `Run over — ${score} m on attempt ${attempts}.`
                    : "The song builds the level. Every spike lands on a beat. Jump them, bounce the yellow rings, race your friends."}
                </p>
              </div>

              {state === "dead" && lastRun && <RunSummary lastRun={lastRun} levelName={def.name} onShare={share} shared={shared} />}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={onStart}
                  className="rounded-full bg-ink px-10 py-3.5 font-display text-base font-extrabold text-ink-inverse shadow-[0_10px_40px_rgba(255,255,255,0.25)] transition hover:scale-[1.03] active:scale-95"
                >
                  {state === "dead" ? "Retry" : "Play"}
                </button>
                <button
                  onClick={toggleMusic}
                  className="flex items-center gap-2 rounded-full border border-glass-border px-4 py-2 text-xs font-semibold text-ink-muted transition hover:border-ink hover:text-ink"
                >
                  {musicOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  Music {musicOn ? "on" : "off"}
                </button>
                <span className="text-[11px] text-ink-faint">Space / tap to jump · double jump in air</span>
              </div>

              <LevelSelect />

              <div>
                <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Character</p>
                <div className="flex gap-2">
                  {SKINS.map((s) => (
                    <Pill
                      key={s.id}
                      active={skin === s.id}
                      onClick={() => {
                        setSkin(s.id);
                        multiplayer.updatePresence();
                      }}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}` }} />
                      {s.label}
                    </Pill>
                  ))}
                </div>
              </div>

              <RacePanel onStartRace={onStartRace} />
            </div>

            {/* right column */}
            <div className="space-y-4 animate-rise [animation-delay:80ms]">
              <SongPanel />
              <TempoPanel />
              <Leaderboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" }) {
  return (
    <div className={`rounded-xl border border-glass-border bg-glass px-4 py-2 backdrop-blur-md ${align === "right" ? "text-right" : ""}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] text-ink-faint">{label}</p>
      <p className="font-display text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function RunSummary({
  lastRun,
  levelName,
  onShare,
  shared,
}: {
  lastRun: NonNullable<ReturnType<typeof useGameStore.getState>["lastRun"]>;
  levelName: string;
  onShare: () => void;
  shared: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3 backdrop-blur-xl">
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-extrabold">
          {lastRun.personalBest ? "New personal best!" : "Nice run"}{" "}
          <span className="text-sun">{lastRun.distance} m</span>
        </p>
        <p className="text-xs text-ink-muted">
          {lastRun.status === "saving" && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> ranking your run…
            </span>
          )}
          {lastRun.status === "done" && lastRun.rank && `#${lastRun.rank} on the ${levelName} leaderboard`}
          {lastRun.status === "done" && !lastRun.rank && lastRun.personalBest && lastRun.distance < 15 && "Reach 15 m to get on the leaderboard."}
          {lastRun.status === "done" && !lastRun.rank && !lastRun.personalBest && "Beat your best to move up the board."}
          {lastRun.status === "error" && "Couldn't save this run — check your connection."}
        </p>
      </div>
      {lastRun.shareCode && (
        <button
          onClick={onShare}
          className="flex items-center gap-2 rounded-full border border-sun/50 bg-sun/15 px-4 py-2 text-xs font-bold text-sun transition hover:bg-sun/25"
        >
          {shared ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
          {shared ? "Link copied" : "Share best run"}
        </button>
      )}
    </div>
  );
}
