import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Loader2, RefreshCw } from "lucide-react";
import { PageLayout, Section } from "@/components/site/PageLayout";
import { lobby, type OpenRoom } from "@/game/lobby";
import { multiplayer, randomRoomCode } from "@/game/multiplayer";
import { useGameStore } from "@/game/store";
import { levelById } from "@/game/levels";

export const Route = createFileRoute("/lobby")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Race Lobby — Join an Open Verity Dash Room" },
      {
        name: "description",
        content:
          "Browse open Verity Dash race rooms, see who is waiting, and join a live race — or open your own room and share the code.",
      },
      { property: "og:title", content: "Verity Dash Race Lobby" },
      { property: "og:description", content: "Find an open room and race other players in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LobbyPage,
});

function LobbyPage() {
  const navigate = useNavigate();
  const { playerName, setPlayerName } = useGameStore();
  const [rooms, setRooms] = useState<OpenRoom[]>(lobby.rooms);
  const [ready, setReady] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const stop = lobby.watch(setRooms);
    const t = setTimeout(() => setReady(true), 1500);
    return () => {
      stop();
      clearTimeout(t);
    };
  }, []);

  const enter = async (roomCode: string) => {
    setJoining(roomCode);
    await multiplayer.join(roomCode);
    await navigate({ to: "/" });
  };

  return (
    <PageLayout
      title="Race lobby"
      intro="Every room that currently has someone waiting shows up here. Join one to race the same generated level at the same moment, or open your own and share the code."
    >
      <Section heading="Your racer name">
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 16))}
          placeholder="Your name"
          className="w-full max-w-xs rounded-lg border border-glass-border bg-glass px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink"
        />
        <p>This is the name other racers see on the race bar and in the match overview.</p>
      </Section>

      <Section heading="Open rooms">
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-glass-border bg-glass p-6 text-center backdrop-blur-xl">
            {ready ? (
              <p>No rooms are open right now. Create one below and send the code to a friend.</p>
            ) : (
              <p className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Looking for open rooms…
              </p>
            )}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.map((r) => (
              <li
                key={r.code}
                className="rounded-2xl border border-glass-border bg-glass p-4 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl font-black tracking-[0.25em] text-ink">{r.code}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {levelById(r.levelId).name} · {r.players.length} waiting
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      r.racing ? "bg-sun/15 text-sun" : "bg-neon/15 text-neon"
                    }`}
                  >
                    {r.racing ? "Racing" : "Open"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.players.map((p, i) => (
                    <span
                      key={`${r.code}-${i}`}
                      className="flex items-center gap-1.5 rounded-full border border-glass-border px-2.5 py-1 text-[11px] text-ink-muted"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => void enter(r.code)}
                  disabled={joining !== null}
                  className="mt-4 w-full rounded-lg bg-ink py-2 text-sm font-bold text-ink-inverse transition hover:opacity-90 disabled:opacity-40"
                >
                  {joining === r.code ? "Joining…" : r.racing ? "Join (race in progress)" : "Join room"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section heading="Join by code or start your own">
        <div className="flex flex-wrap gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
            placeholder="ROOM CODE"
            className="w-40 rounded-lg border border-glass-border bg-glass px-3 py-2 font-mono text-sm tracking-[0.25em] text-ink outline-none placeholder:text-ink-faint focus:border-ink"
          />
          <button
            disabled={code.length < 4 || joining !== null}
            onClick={() => void enter(code)}
            className="rounded-lg bg-ink px-5 py-2 text-sm font-bold text-ink-inverse disabled:opacity-40"
          >
            Join
          </button>
          <button
            disabled={joining !== null}
            onClick={() => void enter(randomRoomCode())}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-5 py-2 text-sm font-semibold text-ink-muted transition hover:border-ink hover:text-ink disabled:opacity-40"
          >
            <Users className="h-4 w-4" /> Create a room
          </button>
          <button
            onClick={() => setRooms([...lobby.rooms])}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2 text-sm text-ink-muted transition hover:border-ink hover:text-ink"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
        <p>
          Rooms appear here automatically while someone is sitting in them, and disappear when the last player leaves.
          Joining takes you straight to the game — the host presses start and everyone runs together.
        </p>
      </Section>
    </PageLayout>
  );
}
