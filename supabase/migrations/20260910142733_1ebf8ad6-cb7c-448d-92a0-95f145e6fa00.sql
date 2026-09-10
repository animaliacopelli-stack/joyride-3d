-- one best row per player per level
DELETE FROM public.runs r
USING public.runs r2
WHERE r.player_id = r2.player_id
  AND r.level_id = r2.level_id
  AND r.id <> r2.id
  AND (r.distance < r2.distance OR (r.distance = r2.distance AND r.created_at > r2.created_at));

ALTER TABLE public.runs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS runs_player_level_uidx ON public.runs (player_id, level_id);
CREATE INDEX IF NOT EXISTS runs_level_distance_idx ON public.runs (level_id, distance DESC, created_at ASC);

-- public columns only: player_id stays hidden, no direct writes
REVOKE ALL ON public.runs FROM anon, authenticated;
GRANT SELECT (id, share_code, player_name, level_id, distance, track_title, track_artist, created_at, updated_at)
  ON public.runs TO anon, authenticated;
GRANT ALL ON public.runs TO service_role;

DROP POLICY IF EXISTS "Runs are publicly readable" ON public.runs;
CREATE POLICY "Runs are publicly readable"
  ON public.runs FOR SELECT TO anon, authenticated USING (true);

-- read helpers run as the caller
CREATE OR REPLACE FUNCTION public.get_leaderboard(_level_id text, _limit integer DEFAULT 25)
RETURNS TABLE(rank bigint, share_code text, player_name text, distance integer, track_title text, track_artist text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT row_number() OVER (ORDER BY r.distance DESC, r.created_at ASC) AS rank,
         r.share_code, r.player_name, r.distance, r.track_title, r.track_artist, r.created_at
  FROM public.runs r
  WHERE r.level_id = _level_id
  ORDER BY r.distance DESC, r.created_at ASC
  LIMIT LEAST(GREATEST(coalesce(_limit, 25), 1), 100);
$$;

CREATE OR REPLACE FUNCTION public.get_run(_share_code text)
RETURNS TABLE(share_code text, player_name text, level_id text, distance integer, track_title text, track_artist text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT r.share_code, r.player_name, r.level_id, r.distance, r.track_title, r.track_artist, r.created_at
  FROM public.runs r
  WHERE r.share_code = _share_code
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.get_player_rank(text, uuid);

CREATE OR REPLACE FUNCTION public.get_run_rank(_share_code text)
RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT 1 + (
    SELECT count(*) FROM public.runs r
    WHERE r.level_id = m.level_id
      AND (r.distance > m.distance OR (r.distance = m.distance AND r.created_at < m.created_at))
  )::integer
  FROM (SELECT distance, level_id, created_at FROM public.runs WHERE share_code = _share_code) m;
$$;

-- submitting stays elevated (anonymous players, hidden identity) but is rate limited and upserts
CREATE OR REPLACE FUNCTION public.submit_run(
  _player_id uuid, _player_name text, _level_id text, _distance integer,
  _track_title text DEFAULT NULL, _track_artist text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code text;
  _name text;
  _existing public.runs%ROWTYPE;
BEGIN
  IF _player_id IS NULL THEN RAISE EXCEPTION 'invalid player'; END IF;
  _name := left(btrim(coalesce(_player_name, '')), 16);
  IF char_length(_name) < 1 THEN _name := 'Racer'; END IF;
  IF _distance IS NULL OR _distance < 0 OR _distance > 100000 THEN
    RAISE EXCEPTION 'invalid distance';
  END IF;
  IF _level_id IS NULL OR char_length(_level_id) < 1 OR char_length(_level_id) > 40 THEN
    RAISE EXCEPTION 'invalid level';
  END IF;

  SELECT * INTO _existing FROM public.runs WHERE player_id = _player_id AND level_id = _level_id;
  IF FOUND THEN
    IF _existing.updated_at > now() - interval '2 seconds' THEN
      RAISE EXCEPTION 'too many submissions';
    END IF;
    IF _distance <= _existing.distance THEN
      RETURN _existing.share_code;
    END IF;
    UPDATE public.runs
       SET distance = _distance,
           player_name = _name,
           track_title = left(_track_title, 120),
           track_artist = left(_track_artist, 120),
           created_at = now(),
           updated_at = now()
     WHERE id = _existing.id;
    RETURN _existing.share_code;
  END IF;

  _code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  INSERT INTO public.runs (share_code, player_id, player_name, level_id, distance, track_title, track_artist)
  VALUES (_code, _player_id, _name, _level_id, _distance, left(_track_title, 120), left(_track_artist, 120));
  RETURN _code;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_run(uuid, text, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_run(uuid, text, text, integer, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_run(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_run_rank(text) TO anon, authenticated, service_role;