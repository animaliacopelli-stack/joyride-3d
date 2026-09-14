import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Track } from "@/lib/music.functions";

const querySchema = z.string().trim().min(1).max(120);

type AppleSearchResult = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
};

export const Route = createFileRoute("/api/public/music-search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = querySchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
        if (!parsed.success) {
          return Response.json({ tracks: [], error: "Enter a song or artist." }, { status: 400 });
        }

        try {
          const endpoint = new URL("https://itunes.apple.com/search");
          endpoint.search = new URLSearchParams({
            media: "music",
            entity: "song",
            limit: "20",
            term: parsed.data,
          }).toString();

          const upstream = await fetch(endpoint, {
            headers: { Accept: "application/json", "User-Agent": "VerityDash/1.0" },
          });
          if (!upstream.ok) throw new Error(`Apple search returned ${upstream.status}`);

          const payload = (await upstream.json()) as { results?: AppleSearchResult[] };
          const tracks: Track[] = (payload.results ?? [])
            .filter((result) => result.previewUrl && result.trackName)
            .map((result) => ({
              id: String(result.trackId ?? result.previewUrl),
              title: result.trackName ?? "Unknown song",
              artist: result.artistName ?? "Unknown artist",
              artwork: (result.artworkUrl100 ?? "").replace("100x100", "300x300"),
              previewUrl: result.previewUrl ?? "",
              source: "apple",
            }));

          return Response.json(
            { tracks },
            { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } },
          );
        } catch (error) {
          console.error("Music search failed", error);
          return Response.json({ tracks: [], error: "Music search is temporarily unavailable." }, { status: 502 });
        }
      },
    },
  },
});