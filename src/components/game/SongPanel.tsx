import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Search, Music2, Loader2, Upload, Trash2, Play, Check } from "lucide-react";
import { searchTracks, type Track } from "@/lib/music.functions";
import { addLocalTrack, listLocalTracks, removeLocalTrack } from "@/game/library";
import { useGameStore } from "@/game/store";
import { music } from "@/game/music";
import { Panel, Pill, Field } from "./ui";

export function SongPanel() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"search" | "mine">("search");
  const track = useGameStore((s) => s.track);
  const setTrack = useGameStore((s) => s.setTrack);
  const fn = useServerFn(searchTracks);
  const fileInput = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const [term, setTerm] = useState("");

  // search as you type, so nothing depends on hitting the button
  useEffect(() => {
    const v = q.trim();
    const id = setTimeout(() => setTerm(v), 350);
    return () => clearTimeout(id);
  }, [q]);

  const search = useQuery({
    queryKey: ["track-search", term],
    queryFn: () => fn({ data: { query: term } }) as Promise<Track[]>,
    enabled: term.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const mine = useQuery({ queryKey: ["local-tracks"], queryFn: listLocalTracks });

  const upload = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const added: Track[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name)) continue;
        added.push(await addLocalTrack(f));
      }
      return added;
    },
    onSuccess: (added) => {
      void qc.invalidateQueries({ queryKey: ["local-tracks"] });
      if (added[0]) pick(added[0]);
      setTab("mine");
    },
  });

  const remove = useMutation({
    mutationFn: removeLocalTrack,
    onSuccess: (_, id) => {
      void qc.invalidateQueries({ queryKey: ["local-tracks"] });
      if (track?.id === id) {
        setTrack(null);
        music.stop();
      }
    },
  });

  const pick = (t: Track) => {
    setTrack(t);
    void music.play(t, 0.65);
  };

  return (
    <Panel
      title="Soundtrack"
      icon={<Music2 className="h-3.5 w-3.5" />}
      aside={
        <div className="flex gap-1">
          <Pill active={tab === "search"} onClick={() => setTab("search")}>
            Search
          </Pill>
          <Pill active={tab === "mine"} onClick={() => setTab("mine")}>
            My uploads
          </Pill>
        </div>
      }
    >
      {track && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-glass-border bg-ink/10 p-2">
          {track.artwork ? (
            <img src={track.artwork} alt="" className="h-11 w-11 rounded-lg" loading="lazy" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sun/20 text-sun">
              <Upload className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{track.title}</p>
            <p className="truncate text-xs text-ink-muted">{track.artist}</p>
          </div>
          <span className="rounded-full bg-neon/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon">
            {track.source === "local" ? "Your file" : "Apple preview"}
          </span>
        </div>
      )}

      {tab === "search" ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTerm(q.trim());
              void search.refetch();
            }}
            className="flex gap-2"
          >
            <Field
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search any song or artist…"
              className="flex-1"
            />
            <button
              type="submit"
              className="rounded-lg bg-ink px-3 py-2 text-ink-inverse transition hover:opacity-90"
              aria-label="Search songs"
            >
              {search.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </form>

          {search.data && search.data.length > 0 && (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {search.data.map((t) => (
                <li key={t.id}>
                  <TrackRow t={t} active={track?.id === t.id} onPick={() => pick(t)} />
                </li>
              ))}
            </ul>
          )}
          {search.data && search.data.length === 0 && !search.isFetching && (
            <p className="mt-3 text-xs text-ink-muted">No playable previews found — try another search.</p>
          )}
          {search.isError && (
            <p className="mt-3 text-xs text-destructive">
              Search didn&apos;t load. Tap the search button to try again.
            </p>
          )}
          <p className="mt-3 text-[11px] leading-snug text-ink-faint">
            Plays the official 30-second preview of any track in the Apple Music catalog, viral hits included. Want
            the full song? Upload your own file.
          </p>
        </>
      ) : (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) upload.mutate(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files.length) upload.mutate(e.dataTransfer.files);
            }}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink/30 bg-ink/5 px-4 py-5 text-center transition hover:border-ink/70 hover:bg-ink/10"
          >
            {upload.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin text-ink" />
            ) : (
              <Upload className="h-5 w-5 text-ink" />
            )}
            <span className="text-sm font-semibold text-ink">Drop a song here or click to upload</span>
            <span className="text-[11px] text-ink-faint">MP3, M4A, WAV, OGG · full-length tracks · stays on this device</span>
          </button>

          {mine.data && mine.data.length > 0 ? (
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
              {mine.data.map((t) => (
                <li key={t.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <TrackRow t={t} active={track?.id === t.id} onPick={() => pick(t)} />
                  </div>
                  <button
                    onClick={() => remove.mutate(t.id)}
                    className="rounded-lg p-2 text-ink-faint transition hover:bg-ink/10 hover:text-ink"
                    aria-label={`Remove ${t.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-ink-faint">No uploads yet. Files never leave your device.</p>
          )}
        </>
      )}
    </Panel>
  );
}

function TrackRow({ t, active, onPick }: { t: Track; active: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-ink/10 ${
        active ? "bg-ink/10" : ""
      }`}
    >
      {t.artwork ? (
        <img src={t.artwork} alt="" className="h-9 w-9 rounded" loading="lazy" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded bg-ink/10 text-ink-muted">
          <Music2 className="h-4 w-4" />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink">{t.title}</span>
        <span className="block truncate text-xs text-ink-faint">{t.artist}</span>
      </span>
      {active ? <Check className="h-4 w-4 text-neon" /> : <Play className="h-4 w-4 text-ink-faint" />}
    </button>
  );
}
