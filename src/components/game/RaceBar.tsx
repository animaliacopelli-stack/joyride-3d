import { useEffect, useRef, useState } from "react";
import { multiplayer } from "@/game/multiplayer";
import { skinById, useGameStore } from "@/game/store";

type Marker = { id: string; name: string; dist: number; color: string; me: boolean; alive: boolean };

/** Horizontal race progress bar — shows every racer's position along the track. */
export function RaceBar() {
  const skin = useGameStore((s) => s.skin);
  const playerName = useGameStore((s) => s.playerName);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [span, setSpan] = useState(150);
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      const s = useGameStore.getState();
      const mine: Marker = {
        id: "me",
        name: playerName || "You",
        dist: s.score,
        color: skinById(skin).color,
        me: true,
        alive: s.state === "playing",
      };
      const peers = multiplayer.list().map<Marker>((p) => ({
        id: p.id,
        name: p.name,
        dist: p.dist,
        color: p.color,
        me: false,
        alive: p.alive,
      }));
      const all = [mine, ...peers];
      const leader = Math.max(...all.map((m) => m.dist), 0);
      setSpan(Math.max(120, leader + 60));
      setMarkers(all);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [skin, playerName]);

  const sorted = [...markers].sort((a, b) => b.dist - a.dist);

  return (
    <div className="absolute left-1/2 top-24 w-[min(92vw,44rem)] -translate-x-1/2 rounded-2xl border border-glass-border bg-glass px-4 py-3 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        <span>Race</span>
        <span>Leader {Math.round(sorted[0]?.dist ?? 0)} m</span>
      </div>

      <div className="relative h-6">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/15" />
        <div className="absolute right-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-ink/40" />

        {markers.map((m) => {
          const pct = Math.max(0, Math.min(1, m.dist / span)) * 100;
          return (
            <div
              key={m.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-100 ease-linear"
              style={{ left: `${pct}%` }}
            >
              <span
                className="block rounded-full ring-2 ring-glass-border"
                style={{
                  width: m.me ? 16 : 12,
                  height: m.me ? 16 : 12,
                  background: m.color,
                  opacity: m.alive ? 1 : 0.35,
                  boxShadow: `0 0 12px ${m.color}`,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {sorted.map((m, i) => (
          <span key={m.id} className="font-mono text-[11px] text-ink-muted">
            <span className="text-ink-faint">{i + 1}.</span>{" "}
            <span style={{ color: m.color }}>●</span>{" "}
            <span className={m.me ? "font-bold text-ink" : ""}>{m.name}</span> {Math.round(m.dist)} m
          </span>
        ))}
      </div>
    </div>
  );
}
