import { useEffect, useState } from "react";
import { Loader2, Trophy } from "lucide-react";
import { multiplayer, type Standing } from "@/game/multiplayer";

/** Post-race summary every racer in the room sees, live until the last player crashes. */
export function MatchOverview() {
  const [rows, setRows] = useState<Standing[]>(() => multiplayer.standings());

  useEffect(() => {
    const id = setInterval(() => setRows(multiplayer.standings()), 300);
    return () => clearInterval(id);
  }, []);

  if (rows.length < 2) return null;
  const racing = rows.filter((r) => !r.finished).length;

  return (
    <div className="rounded-2xl border border-glass-border bg-glass px-4 py-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-ink-muted">Match overview</p>
        <p className="text-[11px] text-ink-faint">
          {racing > 0 ? `${racing} still racing` : "Everyone finished"}
        </p>
      </div>
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 text-right font-mono text-[11px] text-ink-faint">{i + 1}.</span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: r.color, boxShadow: `0 0 10px ${r.color}` }}
            />
            <span className={`min-w-0 flex-1 truncate ${r.me ? "font-bold text-ink" : "text-ink-muted"}`}>
              {r.name}
              {r.me ? " (you)" : ""}
            </span>
            {i === 0 && r.finished && racing === 0 && <Trophy className="h-3.5 w-3.5 text-sun" />}
            {!r.finished && <Loader2 className="h-3 w-3 animate-spin text-ink-faint" />}
            <span className="font-mono tabular-nums text-ink">{Math.round(r.dist)} m</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
