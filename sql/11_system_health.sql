-- ============================================================================
-- 11 — SYSTEM / BOT HEALTH (admin-only observability + capacity controls)
-- ============================================================================
-- KYA KARTA HAI:
--   1. `users.last_seen` column — lightweight presence tracking. App ke hot
--      routes (home / game state poll / queue poll) isko ~60s me ek baar
--      touch karte hain (self-throttling UPDATE), taaki "active users (last
--      5 min)" ka realtime count nikal sake bina koi heavy writes ke.
--   2. `usage_daily` table — Cloudflare FREE plan ka 100,000 requests/day
--      quota counter (Error 1027 se bachne ke liye). Columns: date,
--      api_requests, game_polls, match_actions.
--   3. `usage_minute` table — per-minute samples (requests-per-minute rate
--      aur "quota kab khatam hoga" estimate ke liye). 30 din se purane
--      samples bump_usage_daily khud clean kar deta hai.
--   4. `bump_usage_daily()` RPC — atomic increment. App in-memory batching
--      use karta hai (har isolate ~20s me ek flush), isliye ye function
--      kabhi bhi race se double-count nahi karta (UPSERT + EXCLUDED).
--   5. DB health RPCs — get_db_size(), get_table_sizes(),
--      get_connection_stats(), get_hourly_activity(p_days).
--      (/admin/system page inhi se data dikhata hai.)
--   6. `get_active_users_count(p_minutes)` RPC — active users count.
--   7. Capacity settings seed — max_concurrent_users, max_concurrent_matches,
--      max_queue_capacity, capacity_enforcement ('block' | 'warn'),
--      server_full_message. Default 'warn' hai — migrate karte hi users
--      block hona shuru NAHI honge, admin ko /admin/system se 'block'
--      karna hoga.
--
-- Run after sql/10_moderators.sql.
-- Idempotent hai — dobara chalao toh bhi kuch tootega nahi.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. users.last_seen — presence tracking
--    (users table base schema se aati hai — repo migrations me banti hi nahi.
--    Guard rakha hai taaki kisi ajeeb fresh DB pe file fail na ho.)
-- ════════════════════════════════════════════════════════════════════════════

DO $presence$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen timestamptz;

    -- Sirf "recently active" users scan karne ke liye partial index — purane
    -- (NULL / stale) rows index me hi nahi aate.
    CREATE INDEX IF NOT EXISTS idx_users_last_seen
        ON public.users (last_seen DESC)
        WHERE last_seen IS NOT NULL;

    COMMENT ON COLUMN public.users.last_seen IS
      'Last API activity (hot routes ~60s me ek baar touch karte hain). Active-user counts isi se bante hain.';
  ELSE
    RAISE NOTICE 'users table missing — last_seen tracking skip';
  END IF;
END
$presence$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. usage_daily — Cloudflare 100k/day quota counter
--    (api_requests = baqi API calls, game_polls = 1.2s wala room-state poll,
--     match_actions = roll/move/queue join-jaisi game mutations)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.usage_daily (
  date          date        PRIMARY KEY,
  api_requests  bigint      NOT NULL DEFAULT 0,
  game_polls    bigint      NOT NULL DEFAULT 0,
  match_actions bigint      NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. usage_minute — per-minute samples (rate + ETA + peak-hours chart)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.usage_minute (
  minute         timestamptz PRIMARY KEY,  -- UTC minute bucket
  api_requests   bigint      NOT NULL DEFAULT 0,
  game_polls     bigint      NOT NULL DEFAULT 0,
  match_actions  bigint      NOT NULL DEFAULT 0
);

ALTER TABLE public.usage_daily  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_minute ENABLE ROW LEVEL SECURITY;
-- Koi policy nahi — sirf service_role (RLS bypass) aur RPCs (SECURITY DEFINER)
-- hi in tables ko chhoo sakte hain. anon/authenticated ke liye locked.

COMMENT ON TABLE  public.usage_daily  IS 'Daily Cloudflare request counter (quota monitor). Atomic increments via bump_usage_daily().';
COMMENT ON TABLE  public.usage_minute IS 'Per-minute request samples — RPM rate, quota ETA, peak-hours chart. >30 din purane rows auto-prune.';
COMMENT ON COLUMN public.usage_daily.game_polls IS 'Sabse bada consumer: /api/ludo/room/state 1.2s polling. Alag track hota hai taaki pata chale polling kitna hissa kha rahi hai.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. bump_usage_daily() — atomic increment (app isko batched flush se call
--    karta hai, ~20s me ek baar per isolate — per-request write nahi)
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.bump_usage_daily(
  p_date    date,
  p_minute  timestamptz,
  p_api     bigint DEFAULT 0,
  p_polls   bigint DEFAULT 0,
  p_actions bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Daily rollup
  INSERT INTO public.usage_daily AS ud
    (date, api_requests, game_polls, match_actions, updated_at)
  VALUES
    (p_date, p_api, p_polls, p_actions, now())
  ON CONFLICT (date) DO UPDATE
    SET api_requests  = ud.api_requests  + EXCLUDED.api_requests,
        game_polls    = ud.game_polls    + EXCLUDED.game_polls,
        match_actions = ud.match_actions + EXCLUDED.match_actions,
        updated_at    = now();

  -- Minute sample
  INSERT INTO public.usage_minute AS um
    (minute, api_requests, game_polls, match_actions)
  VALUES
    (date_trunc('minute', p_minute), p_api, p_polls, p_actions)
  ON CONFLICT (minute) DO UPDATE
    SET api_requests  = um.api_requests  + EXCLUDED.api_requests,
        game_polls    = um.game_polls    + EXCLUDED.game_polls,
        match_actions = um.match_actions + EXCLUDED.match_actions;

  -- Purane minute-samples occasionally prune (har call pe nahi — 2% chance
  -- hi kaafi hai, table chhoti rehti hai aur bump hot-path sasta rehta hai).
  IF random() < 0.02 THEN
    DELETE FROM public.usage_minute
     WHERE minute < now() - interval '30 days';
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. get_active_users_count(p_minutes) — last N minutes me active users
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_active_users_count(p_minutes integer DEFAULT 5)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT count(*)
  FROM public.users
  WHERE last_seen >= now() - (p_minutes * interval '1 minute');
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. DB health RPCs (Supabase FREE plan ka 500 MB limit monitor)
-- ════════════════════════════════════════════════════════════════════════════

-- Total DB size in bytes (MB conversion app me hota hai)
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT pg_database_size(current_database());
$$;

-- Top tables by size — users, transactions, ad_logs, ludo_match_history,
-- admin_logs etc. me se kaun sabse zyada jagah kha raha hai.
CREATE OR REPLACE FUNCTION public.get_table_sizes()
RETURNS TABLE (
  table_name  text,
  total_bytes bigint,
  index_bytes bigint,
  row_estimate bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT c.relname::text                                  AS table_name,
         pg_total_relation_size(c.oid)                    AS total_bytes,
         pg_indexes_size(c.oid)                           AS index_bytes,
         GREATEST(c.reltuples::bigint, 0)                 AS row_estimate
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC
  LIMIT 15;
$$;

-- Active connections (pg_stat_activity) — Supabase FREE me connection
-- limit tight hai, isliye ye number panel pe dikhna chahiye.
CREATE OR REPLACE FUNCTION public.get_connection_stats()
RETURNS TABLE (
  total_connections  bigint,
  active_connections bigint,
  idle_connections   bigint,
  max_connections_setting integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT (SELECT count(*) FROM pg_stat_activity)                                AS total_connections,
         (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')         AS active_connections,
         (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle')           AS idle_connections,
         current_setting('max_connections')::integer                            AS max_connections_setting;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. get_hourly_activity(p_days) — peak hours chart (last N din, hour-wise)
--    Har source ka apna column: requests (usage_minute), ad plays, matches,
--    signups. Admin panel ise 24-bar chart me dikhata hai.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_hourly_activity(p_days integer DEFAULT 7)
RETURNS TABLE (
  hour_of_day smallint,
  requests    bigint,
  ad_plays    bigint,
  matches     bigint,
  signups     bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH span AS (
    SELECT now() - (GREATEST(p_days, 1) * interval '1 day') AS since
  ),
  reqs AS (
    SELECT EXTRACT(hour FROM um.minute)::smallint AS hh,
           sum(um.api_requests + um.game_polls + um.match_actions) AS n
    FROM public.usage_minute um
    WHERE um.minute > (SELECT since FROM span)
    GROUP BY 1
  ),
  ads AS (
    SELECT EXTRACT(hour FROM al.created_at)::smallint AS hh, count(*)::bigint AS n
    FROM public.ad_logs al
    WHERE al.created_at > (SELECT since FROM span)
    GROUP BY 1
  ),
  mats AS (
    SELECT EXTRACT(hour FROM mh.created_at)::smallint AS hh,
           count(DISTINCT mh.room_id)::bigint AS n
    FROM public.ludo_match_history mh
    WHERE mh.created_at > (SELECT since FROM span)
    GROUP BY 1
  ),
  sigs AS (
    SELECT EXTRACT(hour FROM u.created_at)::smallint AS hh, count(*)::bigint AS n
    FROM public.users u
    WHERE u.created_at > (SELECT since FROM span)
    GROUP BY 1
  ),
  hours AS (
    SELECT generate_series(0, 23)::smallint AS hh
  )
  SELECT hours.hh                                        AS hour_of_day,
         COALESCE(reqs.n, 0)                             AS requests,
         COALESCE(ads.n, 0)                              AS ad_plays,
         COALESCE(mats.n, 0)                             AS matches,
         COALESCE(sigs.n, 0)                             AS signups
  FROM hours
  LEFT JOIN reqs ON reqs.hh = hours.hh
  LEFT JOIN ads  ON ads.hh  = hours.hh
  LEFT JOIN mats ON mats.hh = hours.hh
  LEFT JOIN sigs ON sigs.hh = hours.hh
  ORDER BY hours.hh;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. get_daily_activity(p_days) — per-day counts (live load + 7-day trend).
--    matches = DISTINCT rooms (ek match me dono players ki rows hoti hain).
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_daily_activity(p_days integer DEFAULT 7)
RETURNS TABLE (
  day      date,
  signups  bigint,
  matches  bigint,
  ad_plays bigint,
  requests bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  WITH days AS (
    SELECT generate_series(
             current_date - (GREATEST(p_days, 1) - 1),
             current_date,
             interval '1 day'
           )::date AS d
  ),
  span AS (
    SELECT current_date - (GREATEST(p_days, 1) - 1) AS since
  ),
  sigs AS (
    SELECT u.created_at::date AS d, count(*)::bigint AS n
    FROM public.users u
    WHERE u.created_at >= (SELECT since FROM span)
    GROUP BY 1
  ),
  mats AS (
    SELECT mh.created_at::date AS d, count(DISTINCT mh.room_id)::bigint AS n
    FROM public.ludo_match_history mh
    WHERE mh.created_at >= (SELECT since FROM span)
    GROUP BY 1
  ),
  ads AS (
    SELECT al.created_at::date AS d, count(*)::bigint AS n
    FROM public.ad_logs al
    WHERE al.created_at >= (SELECT since FROM span)
    GROUP BY 1
  ),
  reqs AS (
    SELECT ud.date AS d,
           sum(ud.api_requests + ud.game_polls + ud.match_actions)::bigint AS n
    FROM public.usage_daily ud
    WHERE ud.date >= (SELECT since FROM span)
    GROUP BY 1
  )
  SELECT days.d                                 AS day,
         COALESCE(sigs.n, 0)                    AS signups,
         COALESCE(mats.n, 0)                    AS matches,
         COALESCE(ads.n, 0)                     AS ad_plays,
         COALESCE(reqs.n, 0)                    AS requests
  FROM days
  LEFT JOIN sigs ON sigs.d = days.d
  LEFT JOIN mats ON mats.d = days.d
  LEFT JOIN ads  ON ads.d  = days.d
  LEFT JOIN reqs ON reqs.d = days.d
  ORDER BY days.d;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. Permissions — ye RPCs sirf service_role ke liye. PUBLIC/anon se
--    REVOKE (db-check.sql ke [C2] point ko dhyan me rakha hai: koi bhi
--    SECURITY DEFINER function public me expose nahi hona chahiye).
-- ════════════════════════════════════════════════════════════════════════════

DO $perms$
DECLARE
  fn text;
BEGIN
  -- In naye RPCs ko sirf service_role chalana chahiye — admin panel ke
  -- server-side code me wahi role use hota hai.
  FOREACH fn IN ARRAY ARRAY[
    'bump_usage_daily(date, timestamptz, bigint, bigint, bigint)',
    'get_active_users_count(integer)',
    'get_db_size()',
    'get_table_sizes()',
    'get_connection_stats()',
    'get_hourly_activity(integer)',
    'get_daily_activity(integer)'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated', fn);
    END IF;
  END LOOP;
END
$perms$;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. Capacity settings seed (existing settings pattern — key/value text)
--    Default 'warn' — migration run karte hi koi user block NAHI hota.
--    /admin/system → Capacity Controls se admin 'block' mode on kar sakta hai.
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO public.settings (key, value) VALUES
  ('max_concurrent_users',    '200'),
  ('max_concurrent_matches',  '100'),
  ('max_queue_capacity',      '500'),
  ('capacity_enforcement',    'warn'),
  ('server_full_message',
   'LUDZO servers are at full capacity right now. Please try again in a few minutes!')
ON CONFLICT (key) DO NOTHING;

COMMIT;
