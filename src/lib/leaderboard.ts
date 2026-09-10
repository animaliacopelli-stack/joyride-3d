import { supabase } from "@/integrations/supabase/client";

export type LeaderboardRow = {
  rank: number;
  share_code: string;
  player_name: string;
  distance: number;
  track_title: string | null;
  track_artist: string | null;
  created_at: string;
};

export async function fetchLeaderboard(levelId: string, limit = 25): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { _level_id: levelId, _limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function submitRun(input: {
  playerId: string;
  playerName: string;
  levelId: string;
  distance: number;
  trackTitle?: string | null;
  trackArtist?: string | null;
}): Promise<{ shareCode: string; rank: number | null }> {
  const { data: code, error } = await supabase.rpc("submit_run", {
    _player_id: input.playerId,
    _player_name: input.playerName,
    _level_id: input.levelId,
    _distance: Math.floor(input.distance),
    _track_title: input.trackTitle ?? undefined,
    _track_artist: input.trackArtist ?? undefined,
  });
  if (error) throw error;
  const { data: rank } = await supabase.rpc("get_player_rank", {
    _level_id: input.levelId,
    _player_id: input.playerId,
  });
  return { shareCode: code as string, rank: (rank as number | null) ?? null };
}

export function shareUrl(code: string) {
  return `${window.location.origin}/run/${code}`;
}

export async function shareRun(opts: { code: string; distance: number; levelName: string }) {
  const url = shareUrl(opts.code);
  const text = `I ran ${opts.distance} m on ${opts.levelName} in Prism Dash — beat it:`;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "Prism Dash run", text, url });
      return "shared" as const;
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}
