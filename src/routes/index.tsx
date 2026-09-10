import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { GameCanvas } from "@/components/game/GameCanvas";
import { useGameStore } from "@/game/store";
import { LEVELS } from "@/game/levels";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { level?: string } => {
    const level = typeof search["level"] === "string" ? search["level"] : undefined;
    return level && LEVELS.some((l) => l.id === level) ? { level } : {};
  },
  head: () => ({
    meta: [
      { title: "Verity Dash — 3D Rhythm Runner for Any Song" },
      {
        name: "description",
        content:
          "Verity Dash is a 3D rhythm platformer: every spike lands on the beat of the song you pick or upload. Race friends live and climb the leaderboard.",
      },
      { property: "og:title", content: "Verity Dash — 3D Rhythm Runner for Any Song" },
      {
        property: "og:description",
        content: "Dodge beat-perfect obstacles in a 3D runner set to any song. Race friends, upload your own tracks, share your best runs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { level } = Route.useSearch();
  useEffect(() => {
    if (level) useGameStore.getState().setLevel(level);
  }, [level]);
  return <GameCanvas />;
}
