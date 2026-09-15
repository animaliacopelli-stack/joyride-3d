import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";
import { AdSlot } from "@/components/game/AdSlot";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to Play Verity Dash — Controls, Orbs and Beat Timing" },
      {
        name: "description",
        content:
          "A full guide to Verity Dash: jump and double-jump timing, yellow bounce orbs, speed ramping, tempo tuning, custom song uploads and live races.",
      },
      { property: "og:title", content: "How to Play Verity Dash" },
      {
        property: "og:description",
        content: "Controls, bounce orbs, beat timing, tempo tuning and live racing explained step by step.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowToPlay,
});

function HowToPlay() {
  return (
    <PageLayout
      title="How to play Verity Dash"
      intro="Verity Dash is a 3D rhythm runner. Your character runs forward on its own, the track is built from the song you choose, and every spike is placed on a beat. Your only job is to be in the air at the right moment."
    >
      <Section heading="The controls">
        <p>
          Press <strong>Space</strong>, click, or tap anywhere on the screen to jump. Press again while you are still in
          the air for a second, shorter jump. You get two jumps before you touch the ground again, which is what makes
          long gaps and stacked spikes survivable.
        </p>
        <p>
          There is no move-left or move-right. Forward speed is handled for you, so every decision you make is about
          timing rather than steering. That is deliberate: once you learn to listen instead of look, your runs get
          dramatically longer.
        </p>
      </Section>

      <Section heading="Reading the obstacles">
        <p>
          Spikes are generated from the song's beat grid. A steady four-on-the-floor track gives you evenly spaced
          single spikes. Busier sections produce clusters placed on subdivisions of the beat, so you will meet two or
          three spikes in quick succession exactly where the drums get busy.
        </p>
        <p>
          The yellow rings floating in the air are bounce orbs. Jump into one and you get an extra launch mid-flight,
          which resets your air jumps. They are placed where the gap is too wide for two jumps alone, so treat a yellow
          ring as a hint that the route goes up and over rather than straight across.
        </p>
      </Section>

      <Section heading="Speed and survival">
        <p>
          The longer you survive, the faster the world scrolls. Early on the ramp is gentle and mostly invisible; past a
          few hundred metres it becomes the main difficulty. Expect your timing window to shrink, and start jumping
          slightly earlier than feels natural.
        </p>
        <p>
          Every attempt is counted, and your best distance is stored per level, so you can see progress on one track
          without it being flattened into a single global score.
        </p>
      </Section>

      <Section heading="Choosing and tuning music">
        <p>
          Use the song panel to search for a track and preview it, or upload an audio file from your own device. Uploaded
          files stay on your device — they are analysed locally in your browser and never sent anywhere.
        </p>
        <p>
          If the generated level feels slightly out of step with what you hear, open the tempo panel. You can nudge the
          detected BPM, tap along to set it manually, and shift the offset in small increments until the spikes land
          exactly on the beat. Songs with heavy swing or a long quiet intro are the usual reason automatic detection
          needs a hand.
        </p>
      </Section>

      <Section heading="Racing other people">
        <p>
          Create a room and share the code, and everyone in that room runs the same generated level from the same seed
          with a synchronised countdown. A bar across the top shows where each racer is, and translucent ghosts show
          their position in the world as they run.
        </p>
        <p>
          When the race ends, everyone sees the same match overview ranked by distance, with a spinner next to anyone
          still alive. Note that uploaded songs are local to your device, so for races pick a searchable track everyone
          can load.
        </p>
      </Section>

      <AdSlot className="mt-4" />
    </PageLayout>
  );
}
