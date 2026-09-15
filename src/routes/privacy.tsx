import { createFileRoute } from "@tanstack/react-router";
import { PageLayout, Section } from "@/components/site/PageLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Verity Dash" },
      {
        name: "description",
        content:
          "How Verity Dash handles your data: anonymous device IDs, leaderboard scores, locally stored song uploads, cookies and advertising.",
      },
      { property: "og:title", content: "Privacy Policy — Verity Dash" },
      { property: "og:description", content: "What Verity Dash stores, what stays on your device, and how ads work." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageLayout
      title="Privacy policy"
      intro="Verity Dash has no accounts and asks for no personal details. This page explains exactly what is stored, where it lives, and what leaves your device."
    >
      <Section heading="No accounts, no sign-up">
        <p>
          You never create an account to play. When you first load the game, a random anonymous identifier is generated
          and saved in your browser so your best distances can be recognised as yours. It is not linked to an email
          address, a name you did not type, or any profile elsewhere.
        </p>
      </Section>

      <Section heading="What is stored in your browser">
        <p>
          Your chosen character, chosen level, best distance per level, display name if you set one, tempo adjustments
          and any songs you upload are stored locally on your device. Uploaded audio in particular never leaves your
          browser: it is decoded and analysed locally and is not transmitted to any server or shared with other players
          in a race.
        </p>
        <p>Clearing your browser storage for this site removes all of it permanently.</p>
      </Section>

      <Section heading="What is stored on our servers">
        <p>
          When you finish a run that qualifies for the leaderboard, the distance, the level, your chosen display name
          and your anonymous device identifier are submitted so the score can be ranked. Shared run links contain a
          random code and the same information. Nothing else about you is recorded.
        </p>
        <p>
          Live race rooms pass position updates between players for the duration of the race. These messages are not
          retained after the room closes.
        </p>
      </Section>

      <Section heading="Music search">
        <p>
          Searching for a song sends the text you typed to Apple's public iTunes search service so previews can be
          returned. Your identity is not attached to that request. Results are cached briefly to reduce repeat lookups.
        </p>
      </Section>

      <Section heading="Advertising and cookies">
        <p>
          This site may display advertising supplied by Google. Third party vendors, including Google, use cookies to
          serve ads based on a user's prior visits to this and other websites. Google's use of advertising cookies
          enables it and its partners to serve ads based on your visit to this site and other sites on the internet.
        </p>
        <p>
          You can opt out of personalised advertising by visiting Google's Ads Settings. Visitors in the EEA, the UK and
          Switzerland are shown a consent message before any personalised advertising cookies are set, and can change
          that choice at any time.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The game is suitable for general audiences, but it is not directed at children under 13, and no information is
          knowingly collected from them beyond the anonymous game data described above.
        </p>
      </Section>

      <Section heading="Changes and contact">
        <p>
          If this policy changes in a way that affects what is collected, the updated version will be posted on this
          page. Questions about your data can be sent through the contact details on the about page.
        </p>
      </Section>
    </PageLayout>
  );
}
