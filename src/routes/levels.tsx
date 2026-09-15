import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";
import { AdSlot } from "@/components/game/AdSlot";
import { LEVELS } from "@/game/levels";

export const Route = createFileRoute("/levels")({
  head: () => ({
    meta: [
      { title: "Verity Dash Levels — Every Track and How to Beat It" },
      {
        name: "description",
        content:
          "Every Verity Dash level explained: tempo, theme, obstacle density and practical tactics for getting a longer run on each one.",
      },
      { property: "og:title", content: "Verity Dash Levels" },
      { property: "og:description", content: "Tempo, theme and tactics for every level in Verity Dash." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LevelsPage,
});

function LevelsPage() {
  return (
    <PageLayout
      title="Levels"
      intro="Each level sets its own tempo, palette and obstacle density, then generates a fresh layout every single run. You will never memorise a level by rote — you learn its rhythm instead."
    >
      <Section heading="Why layouts change every run">
        <p>
          Traditional platformers reward memorisation: play the same fifty seconds enough times and your fingers learn
          the sequence. Verity Dash generates a new seed on every attempt, so the spacing, cluster sizes and orb
          placements differ each time while staying locked to the song's beat grid.
        </p>
        <p>
          The result is that improvement comes from reading and reacting rather than recall. In a live race everyone in
          the room shares one seed, so the comparison stays fair.
        </p>
      </Section>

      <Section heading="The lineup">
        <div className="grid gap-4 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <article key={l.id} className="rounded-2xl border border-glass-border bg-glass p-4 backdrop-blur-xl">
              <h3 className="font-display text-lg font-extrabold text-ink">{l.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-faint">
                {l.difficulty} · {l.bpm} BPM default tempo
              </p>
              <p className="mt-2 text-sm text-ink-muted">{l.subtitle}</p>
              <Link
                to="/"
                search={{ level: l.id }}
                className="mt-3 inline-block text-xs font-bold uppercase tracking-[0.18em] text-neon"
              >
                Play this level
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section heading="Getting further on any level">
        <p>
          Turn the music up. It sounds glib, but the whole game is built so that the audio tells you what is coming
          before you can see it clearly. Players who race with sound off consistently stall at roughly half the distance.
        </p>
        <p>
          Jump slightly early rather than slightly late. A jump started early still clears a spike on the way down; a
          late one never recovers. And when the speed ramp kicks in, stop watching the character and watch the horizon.
        </p>
      </Section>

      <AdSlot className="mt-4" />
    </PageLayout>
  );
}
