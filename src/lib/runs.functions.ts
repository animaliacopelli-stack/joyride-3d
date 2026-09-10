import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type SharedRun = {
  share_code: string;
  player_name: string;
  level_id: string;
  distance: number;
  track_title: string | null;
  track_artist: string | null;
  created_at: string;
};

/** Public read of one shared run (used by the share page during SSR). */
export const getSharedRun = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(32) }).parse(data))
  .handler(async ({ data }): Promise<SharedRun | null> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_run", { _share_code: data.code });
    if (error) throw new Error(error.message);
    const row = (rows as SharedRun[] | null)?.[0];
    return row ?? null;
  });
