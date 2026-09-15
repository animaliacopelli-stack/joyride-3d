import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";
import { AdSlot } from "@/components/game/AdSlot";
import { SKINS } from "@/game/store";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Verity Dash Characters — The Full Cast and Colour Variants" },
      {
        name: "description",
        content:
          "Meet every playable character in Verity Dash, from the yellow Verity smiley to Falsity, Anxiety, Fearity, Nostalgity and the Verity God variant.",
      },
      { property: "og:title", content: "Verity Dash Characters" },
      { property: "og:description", content: "The full playable cast of Verity Dash and what each one represents." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharactersPage,
});

function CharactersPage() {
  return (
    <PageLayout
      title="The cast"
      intro="Every character is a different feeling wearing a different colour. They all run and jump identically — the choice is purely about who you want to be while you fail at 340 metres."
    >
      <Section heading="Why they all play the same">
        <p>
          Nothing in the cast gives a competitive advantage. There are no faster characters and no smaller hitboxes,
          because the leaderboard compares distance on the same generated rules for everyone. A skin changes the colour
          of your ghost in a live room, the tint of your particle trail, and the expression on your face when you land.
        </p>
      </Section>

      <Section heading="Every character">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SKINS.map((s) => (
            <article key={s.id} className="flex items-center gap-3 rounded-2xl border border-glass-border bg-glass p-3 backdrop-blur-xl">
              <span
                className="h-8 w-8 shrink-0 rounded-full"
                style={{ backgroundColor: s.color, boxShadow: `0 0 18px ${s.color}` }}
              />
              <span className="min-w-0">
                <span className="block font-display text-sm font-extrabold text-ink">{s.label}</span>
                <span className="block text-xs text-ink-faint">{s.note}</span>
              </span>
            </article>
          ))}
        </div>
      </Section>

      <Section heading="Picking one">
        <p>
          Open the character grid on the menu screen and tap any of them; the change applies instantly and is remembered
          on your device for next time. In a live room your choice is broadcast to everyone, so the colour you pick is
          how your friends will identify you on the race bar.
        </p>
        <p>
          A practical tip for races: pick a colour nobody else in the room has. Two players in similar colours is the
          most common reason people lose track of themselves on a crowded bar.
        </p>
      </Section>

      <AdSlot className="mt-4" />
    </PageLayout>
  );
}
