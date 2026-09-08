import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search, Music2, Loader2 } from "lucide-react";
import { searchTracks, type Track } from "@/lib/music.functions";
import { useGameStore } from "@/game/store";
import { music } from "@/game/music";

export function SongPanel() {
  const [q, setQ] = useState("");
  const track = useGameStore((s) => s.track);
  const setTrack = useGameStore((s) => s.setTrack);
  const fn = useServerFn(searchTracks);

  const search = useMutation({
    mutationFn: (query: string) => fn({ data: { query } }) as Promise<Track[]>,
  });

  const pick = (t: Track) => {
    setTrack(t);
    void music.play(t.previewUrl, 0.65);
  };

  return (
    <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/15 bg-black/50 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-white/80">
        <Music2 className="h-4 w-4" /> Soundtrack
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) search.mutate(q.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            // This stops the spacebar (and any other keys) from triggering the game!
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          placeholder="Search any song or artist…"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40"
        />
        <button
          type="submit"
          className="rounded-lg bg-white/90 px-3 py-2 text-black transition hover:bg-white"
          aria-label="Search songs"
        >
          {search.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>

      {track && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/15 bg-white/10 p-2">
          {track.artwork && (
            <img src={track.artwork} alt="" className="h-10 w-10 rounded" loading="lazy" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{track.title}</p>
            <p className="truncate text-xs text-white/60">{track.artist}</p>
          </div>
        </div>
      )}

      {search.data && search.data.length > 0 && (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
          {search.data.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => pick(t)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/10"
              >
                {t.artwork && <img src={t.artwork} alt="" className="h-9 w-9 rounded" loading="lazy" />}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{t.title}</span>
                  <span className="block truncate text-xs text-white/50">{t.artist}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {search.data && search.data.length === 0 && (
        <p className="mt-3 text-xs text-white/50">No playable previews found — try another search.</p>
      )}
      {search.isError && (
        <p className="mt-3 text-xs text-red-300">Search failed. Check your connection and retry.</p>
      )}
      <p className="mt-3 text-[11px] leading-snug text-white/40">
        Plays the official 30-second preview of any track in the Apple Music catalog — including
        viral and trending songs. The level and lights react to the beat.
      </p>
    </div>
  );
}
