import { createFileRoute, Link } from "@tanstack/react-router";
import { getSharedRun } from "@/lib/runs.functions";
import { levelById, LEVELS } from "@/game/levels";
import { THEMES } from "@/game/world";

const TITLE = "Verity Dash run";

export const Route = createFileRoute("/run/$code")({
  loader: ({ params }) => getSharedRun({ data: { code: params.code } }),
  head: ({ loaderData }) => {
    const run = loaderData ?? null;
    const level = run ? levelById(run.level_id) : null;
    const title = run ? `${run.player_name} ran ${run.distance} m on ${level?.name ?? "Verity Dash"}` : TITLE;
    const description = run
      ? `Beat ${run.player_name}'s ${run.distance} m on ${level?.name ?? "this level"} in Verity Dash, the 3D rhythm runner that builds its level from your song.`
      : "A shared Verity Dash run.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SharedRunPage,
  errorComponent: () => <Shell title="This run couldn't be loaded" body="Try again in a moment." />,
  notFoundComponent: () => <Shell title="Run not found" body="That link doesn't point at a run anymore." />,
});

function SharedRunPage() {
  const run = Route.useLoaderData();
  if (!run) return <Shell title="Run not found" body="That link doesn't point at a run anymore." />;
  const level = LEVELS.some((l) => l.id === run.level_id) ? levelById(run.level_id) : null;
  const theme = THEMES[(level?.themeIndex ?? 0) % THEMES.length]!;
  const date = new Date(run.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <Shell
      accent={theme.grid}
      bg={theme.bg}
      eyebrow={level?.name ?? run.level_id}
      title={`${run.distance} m`}
      body={`${run.player_name} · ${date}${run.track_title ? ` · ♪ ${run.track_title}${run.track_artist ? ` — ${run.track_artist}` : ""}` : ""}`}
      levelId={level?.id}
    />
  );
}

function Shell({
  title,
  body,
  eyebrow,
  accent = "#6ae1ff",
  bg = "#0b0f33",
  levelId,
}: {
  title: string;
  body: string;
  eyebrow?: string | undefined;
  accent?: string | undefined;
  bg?: string | undefined;
  levelId?: string | undefined;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16 font-body text-ink"
      style={{ background: `radial-gradient(120% 90% at 50% 0%, ${accent}22 0%, ${bg} 55%, #000 100%)` }}
    >
      <article className="w-full max-w-md rounded-3xl border border-glass-border bg-glass p-8 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-ink-muted">Verity Dash</p>
        {eyebrow && (
          <p className="mt-6 font-display text-sm font-extrabold uppercase tracking-[0.2em]" style={{ color: accent }}>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-display text-6xl font-black leading-none tracking-tight">{title}</h1>
        <p className="mt-4 text-sm text-ink-muted">{body}</p>
        <Link
          to="/"
          search={levelId ? { level: levelId } : {}}
          className="mt-8 inline-block rounded-full bg-ink px-8 py-3 font-display text-sm font-extrabold text-ink-inverse transition hover:scale-[1.03]"
        >
          {levelId ? "Try to beat it" : "Play Verity Dash"}
        </Link>
      </article>
    </main>
  );
}
