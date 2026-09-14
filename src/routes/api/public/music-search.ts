import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Track } from "@/lib/music.functions";

const querySchema = z.string().trim().min(1).max(120);

type CacheEntry = { tracks: Track[]; expires: number };
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Track[]>>();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

        const key = parsed.data.toLowerCase();
        const now = Date.now();
        const cached = cache.get(key);
        if (cached && cached.expires > now) {
          return Response.json(
            { tracks: cached.tracks },
            { headers: { "cache-control": "public, max-age=600, stale-while-revalidate=3600" } },
          );
        }

        try {
          let pending = inflight.get(key);
          if (!pending) {
            pending = fetchTracks(parsed.data).finally(() => inflight.delete(key));
            inflight.set(key, pending);
          }
          const tracks = await pending;
          cache.set(key, { tracks, expires: Date.now() + CACHE_TTL_MS });
          if (cache.size > 300) {
            for (const [k, v] of cache) if (v.expires <= Date.now()) cache.delete(k);
          }
          return Response.json(
            { tracks },
            { headers: { "cache-control": "public, max-age=600, stale-while-revalidate=3600" } },
          );
        } catch (error) {
          console.error("Music search failed", error);
          if (cached) {
            return Response.json({ tracks: cached.tracks }, { headers: { "cache-control": "no-store" } });
          }
          return Response.json({ tracks: [], error: "Music search is temporarily unavailable." }, { status: 502 });
        }
      },
    },
  },
});

async function fetchTracks(term: string): Promise<Track[]> {
  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.search = new URLSearchParams({ media: "music", entity: "song", limit: "20", term }).toString();

  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "VerityDash/1.0" },
    });
    if (upstream.ok) {
      const payload = (await upstream.json()) as { results?: AppleSearchResult[] };
      return (payload.results ?? [])
        .filter((result) => result.previewUrl && result.trackName)
        .map((result) => ({
          id: String(result.trackId ?? result.previewUrl),
          title: result.trackName ?? "Unknown song",
          artist: result.artistName ?? "Unknown artist",
          artwork: (result.artworkUrl100 ?? "").replace("100x100", "300x300"),
          previewUrl: result.previewUrl ?? "",
          source: "apple" as const,
        }));
    }
    lastStatus = upstream.status;
    if (upstream.status !== 429 && upstream.status < 500) break;
    await sleep(250 * 2 ** attempt);
  }
  throw new Error(`Apple search returned ${lastStatus}`);
}