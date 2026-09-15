import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Verity Dash" },
      {
        name: "description",
        content:
          "The rules for using Verity Dash: acceptable use, uploaded music and copyright, leaderboard fair play, and availability.",
      },
      { property: "og:title", content: "Terms of Use — Verity Dash" },
      { property: "og:description", content: "Acceptable use, music uploads, fair play and availability." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageLayout
      title="Terms of use"
      intro="Short version: play fair, only upload music you are allowed to use, and understand that this is a free game offered as-is."
    >
      <Section heading="Using the game">
        <p>
          Verity Dash is provided free of charge for personal entertainment. You may play it, share links to it, and
          share your run links. You may not attempt to disrupt the service, interfere with other players' races, or
          access parts of the system you were not given access to.
        </p>
      </Section>

      <Section heading="Music you upload">
        <p>
          Uploaded audio stays on your own device and is never distributed by us. You are nonetheless responsible for
          ensuring you have the right to use any file you load into the game. Song previews returned by search come from
          Apple's public catalogue and remain the property of their respective rights holders.
        </p>
      </Section>

      <Section heading="Leaderboards and fair play">
        <p>
          Scores are submitted from your browser. Attempts to submit fabricated distances, automate play, or flood the
          board with junk entries may result in those entries being removed. Display names that are abusive or
          impersonate someone else may also be removed without notice.
        </p>
      </Section>

      <Section heading="Availability and liability">
        <p>
          The game is offered as-is, without warranty. It may be changed, interrupted or discontinued at any time, and
          locally stored progress can be lost if you clear your browser data or if storage keys change between versions.
          We are not liable for lost scores, lost uploads, or any indirect loss arising from use of the game.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          These terms may be updated from time to time. Continuing to play after an update means you accept the revised
          version.
        </p>
      </Section>
    </PageLayout>
  );
}
