CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code text NOT NULL UNIQUE,
  player_id uuid NOT NULL,
  player_name text NOT NULL,
  level_id text NOT NULL,
  distance integer NOT NULL,
  track_title text,
  track_artist text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT runs_distance_range CHECK (distance >= 0 AND distance <= 100000),
  CONSTRAINT runs_name_len CHECK (char_length(player_name) BETWEEN 1 AND 16),
  CONSTRAINT runs_level_len CHECK (char_length(level_id) BETWEEN 1 AND 40)
);

GRANT ALL ON public.runs TO service_role;

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX runs_level_player_idx ON public.runs (level_id, player_id, distance DESC);
CREATE INDEX runs_level_distance_idx ON public.runs (level_id, distance DESC);

-- Submit a run; returns the share code.
CREATE OR REPLACE FUNCTION public.submit_run(
  _player_id uuid,
  _player_name text,
  _level_id text,
  _distance integer,
  _track_title text DEFAULT NULL,
  _track_artist text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code text;
  _name text;
BEGIN
  _name := left(btrim(coalesce(_player_name, '')), 16);
  IF char_length(_name) < 1 THEN _name := 'Racer'; END IF;
  IF _distance IS NULL OR _distance < 0 OR _distance > 100000 THEN
    RAISE EXCEPTION 'invalid distance';
  END IF;
  IF _level_id IS NULL OR char_length(_level_id) < 1 OR char_length(_level_id) > 40 THEN
    RAISE EXCEPTION 'invalid level';
  END IF;
  _code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  INSERT INTO public.runs (share_code, player_id, player_name, level_id, distance, track_title, track_artist)
  VALUES (_code, _player_id, _name, _level_id, _distance, left(_track_title, 120), left(_track_artist, 120));
  RETURN _code;
END;
$$;

-- Best run per player on a level, ranked.
CREATE OR REPLACE FUNCTION public.get_leaderboard(_level_id text, _limit integer DEFAULT 25)
RETURNS TABLE (
  rank bigint,
  share_code text,
  player_name text,
  distance integer,
  track_title text,
  track_artist text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH best AS (
    SELECT DISTINCT ON (r.player_id)
      r.share_code, r.player_name, r.distance, r.track_title, r.track_artist, r.created_at
    FROM public.runs r
    WHERE r.level_id = _level_id
    ORDER BY r.player_id, r.distance DESC, r.created_at ASC
  )
  SELECT row_number() OVER (ORDER BY b.distance DESC, b.created_at ASC) AS rank,
         b.share_code, b.player_name, b.distance, b.track_title, b.track_artist, b.created_at
  FROM best b
  ORDER BY b.distance DESC, b.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$$;

-- A player's rank on a level (1 = best). NULL if no runs.
CREATE OR REPLACE FUNCTION public.get_player_rank(_level_id text, _player_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT max(distance) AS d FROM public.runs WHERE level_id = _level_id AND player_id = _player_id
  ),
  best AS (
    SELECT player_id, max(distance) AS d FROM public.runs WHERE level_id = _level_id GROUP BY player_id
  )
  SELECT CASE WHEN (SELECT d FROM mine) IS NULL THEN NULL
         ELSE 1 + (SELECT count(*) FROM best WHERE best.d > (SELECT d FROM mine))::integer END;
$$;

-- Look up a single shared run.
CREATE OR REPLACE FUNCTION public.get_run(_share_code text)
RETURNS TABLE (
  share_code text,
  player_name text,
  level_id text,
  distance integer,
  track_title text,
  track_artist text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.share_code, r.player_name, r.level_id, r.distance, r.track_title, r.track_artist, r.created_at
  FROM public.runs r
  WHERE r.share_code = _share_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.submit_run(uuid, text, text, integer, text, text) FROM public;
REVOKE ALL ON FUNCTION public.get_leaderboard(text, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_player_rank(text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_run(text) FROM public;

GRANT EXECUTE ON FUNCTION public.submit_run(uuid, text, text, integer, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_player_rank(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_run(text) TO anon, authenticated, service_role;