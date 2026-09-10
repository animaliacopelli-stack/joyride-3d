import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy, Share2, Loader2, Check } from "lucide-react";
import { fetchLeaderboard, shareRun } from "@/lib/leaderboard";
import { levelById } from "@/game/levels";
import { useGameStore } from "@/game/store";
import { Panel } from "./ui";

export function Leaderboard() {
  const levelId = useGameStore((s) => s.levelId);
  const myCode = useGameStore((s) => s.myShareCodes[levelId]);
  const def = levelById(levelId);
  const [shared, setShared] = useState<string | null>(null);

  const board = useQuery({
    queryKey: ["leaderboard", levelId],
    queryFn: () => fetchLeaderboard(levelId, 25),
    staleTime: 30_000,
  });

  const share = async (code: string, distance: number) => {
    const r = await shareRun({ code, distance, levelName: def.name });
    setShared(r === "failed" ? null : code);
    setTimeout(() => setShared(null), 2500);
  };

  return (
    <Panel
      title={`Leaderboard · ${def.name}`}
      icon={<Trophy className="h-3.5 w-3.5" />}
      aside={board.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" /> : null}
    >
      {board.isError && <p className="text-xs text-destructive">Couldn't load the board right now.</p>}
      {board.data && board.data.length === 0 && (
        <p className="text-xs text-ink-muted">Nobody has posted a run on {def.name} yet. Be the first.</p>
      )}
      {board.data && board.data.length > 0 && (
        <ol className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {board.data.map((r) => {
            const me = r.share_code === myCode;
            return (
              <li
                key={r.share_code}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${me ? "bg-sun/15 ring-1 ring-sun/40" : ""}`}
              >
                <span
                  className={`w-6 shrink-0 text-right font-display text-sm font-black tabular-nums ${
                    r.rank === 1 ? "text-sun" : r.rank <= 3 ? "text-neon" : "text-ink-faint"
                  }`}
                >
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {r.player_name}
                    {me && <span className="ml-1.5 text-[10px] font-bold uppercase text-sun">you</span>}
                  </span>
                  {r.track_title && (
                    <span className="block truncate text-[11px] text-ink-faint">
                      ♪ {r.track_title}
                      {r.track_artist ? ` — ${r.track_artist}` : ""}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm font-bold text-ink">{r.distance} m</span>
                <button
                  onClick={() => void share(r.share_code, r.distance)}
                  className="rounded-md p-1.5 text-ink-faint transition hover:bg-ink/10 hover:text-ink"
                  aria-label="Share this run"
                >
                  {shared === r.share_code ? <Check className="h-3.5 w-3.5 text-neon" /> : <Share2 className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-3 text-[11px] leading-snug text-ink-faint">
        Only your best run per level counts. Share opens a page anyone can visit, even without the game open.
      </p>
    </Panel>
  );
}
