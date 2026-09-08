import { createFileRoute } from "@tanstack/react-router";
import { GameCanvas } from "@/components/game/GameCanvas";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prism Dash — 3D Rhythm Jump Game" },
      {
        name: "description",
        content:
          "Prism Dash is a fast 3D rhythm platformer: dodge neon spikes, switch skins, and play any song you search for.",
      },
      { property: "og:title", content: "Prism Dash — 3D Rhythm Jump Game" },
      {
        property: "og:description",
        content: "Dodge neon obstacles in a 3D rhythm runner set to any song you search for.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameCanvas,
});
