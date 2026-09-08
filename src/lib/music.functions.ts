import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Track = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  previewUrl: string;
};

export const searchTracks = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ query: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }): Promise<Track[]> => {
    const url = `https://itunes.apple.com/search?media=music&limit=18&term=${encodeURIComponent(
      data.query,
    )}`;
    const res = await fetch(url, { headers: { "User-Agent": "PrismDash/1.0" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: Array<{
        trackId?: number;
        trackName?: string;
        artistName?: string;
        artworkUrl100?: string;
        previewUrl?: string;
      }>;
    };
    return (json.results ?? [])
      .filter((r) => r.previewUrl && r.trackName)
      .map((r) => ({
        id: String(r.trackId ?? r.previewUrl),
        title: r.trackName!,
        artist: r.artistName ?? "Unknown",
        artwork: (r.artworkUrl100 ?? "").replace("100x100", "300x300"),
        previewUrl: r.previewUrl!,
      }));
  });
