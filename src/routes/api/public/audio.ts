import { createFileRoute } from "@tanstack/react-router";

/**
 * Same-origin proxy for Apple Music preview audio. Apple's CDN doesn't send
 * CORS headers, so the browser can't analyse (or, with crossOrigin set, even
 * play) the previews directly. Only Apple hosts are allowed through.
 */
const ALLOWED_HOSTS = [/(^|\.)itunes\.apple\.com$/i, /(^|\.)mzstatic\.com$/i, /(^|\.)apple\.com$/i];

const PASS_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

export const Route = createFileRoute("/api/public/audio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("u");
        if (!raw) return new Response("Missing url", { status: 400 });
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Bad url", { status: 400 });
        }
        if (target.protocol !== "https:" || !ALLOWED_HOSTS.some((r) => r.test(target.hostname))) {
          return new Response("Host not allowed", { status: 403 });
        }

        const headers: Record<string, string> = { "User-Agent": "PrismDash/1.0" };
        const range = request.headers.get("range");
        if (range) headers["Range"] = range;

        const upstream = await fetch(target.toString(), { headers });
        if (!upstream.ok && upstream.status !== 206) {
          return new Response("Upstream error", { status: 502 });
        }

        const out = new Headers();
        for (const h of PASS_HEADERS) {
          const v = upstream.headers.get(h);
          if (v) out.set(h, v);
        }
        const ct = out.get("content-type") ?? "";
        if (!ct || /x-m4p|octet-stream/i.test(ct)) out.set("content-type", "audio/mp4");
        out.set("cache-control", "public, max-age=86400, immutable");
        out.set("access-control-allow-origin", "*");

        return new Response(upstream.body, { status: upstream.status, headers: out });
      },
    },
  },
});
