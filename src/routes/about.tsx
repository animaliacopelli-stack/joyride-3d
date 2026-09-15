import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";
import { AdSlot } from "@/components/game/AdSlot";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Verity Dash — The Game and How It Was Built" },
      {
        name: "description",
        content:
          "What Verity Dash is, how songs are turned into playable levels, what technology runs it, and how to get in touch with feedback.",
      },
      { property: "og:title", content: "About Verity Dash" },
      { property: "og:description", content: "How a song becomes a playable 3D level, and who made it." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageLayout
      title="About Verity Dash"
      intro="Verity Dash is a browser-based 3D rhythm runner built around one idea: the song should build the level, not decorate it."
    >
      <Section heading="What the game is">
        <p>
          You control Verity, a yellow smiling sphere, and a cast of colour variants each with their own expression. The
          world scrolls forward, neon obstacles rise out of the floor in time with the music, and you jump. It borrows
          its feel from the one-button platformer tradition, but the track is generated rather than hand-placed.
        </p>
      </Section>

      <Section heading="How a song becomes a level">
        <p>
          When you pick or upload a track, the audio is decoded in your browser and analysed for onsets and energy. From
          that analysis the game estimates a tempo, locks a beat phase, and builds a timing grid. Obstacles are then
          scheduled against that grid rather than against wall-clock time, which is why spikes land on the beat instead
          of near it.
        </p>
        <p>
          Loud, percussive sections produce denser clusters; quiet passages open up. Bounce orbs are added where the
          scheduled gap exceeds what two jumps can clear, so the generated route is always physically possible.
        </p>
      </Section>

      <Section heading="How it is built">
        <p>
          The game renders with WebGL through React Three Fiber and Three.js, runs its state in a lightweight store, and
          uses the Web Audio API for decoding and analysis. Live races use realtime messaging: position packets go out
          roughly twenty-five times a second and peer movement is interpolated between them so ghosts look smooth rather
          than teleporting.
        </p>
        <p>
          It is a web app, so there is nothing to install. It works best on a desktop browser with a keyboard, but touch
          controls work on phones and tablets too.
        </p>
      </Section>

      <Section heading="Contact and feedback">
        <p>
          Found a song that generates a badly timed level, or a bug in a live room? Feedback is genuinely useful —
          especially the song title, because tempo detection edge cases are usually reproducible. Reach out through the
          site this game is published on and include what you were playing and what went wrong.
        </p>
      </Section>

      <AdSlot className="mt-4" />
    </PageLayout>
  );
}
