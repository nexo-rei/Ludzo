-- ============================================================================
-- LUDZO — 99_verify.sql  (READ-ONLY — safe to run any time, delete afterwards)
-- ============================================================================
-- Prints a PASS/FAIL table for everything the Ludo code depends on.
-- Every row should say PASS after running 02_ludo_fixes.sql + 03_ludo_cron.sql.
-- ============================================================================

-- Tiny helper so the cron check compiles even without pg_cron. Dropped at the end.
CREATE OR REPLACE FUNCTION public._ludo_verify_cron_scheduled()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v boolean := false;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = ''ludo_janitor_every_minute'' AND active)'
        INTO v;
    END IF;
    RETURN v;
END;
$$;

WITH checks(ord, category, item, ok) AS (
    VALUES
    -- tables
    (10, 'table',  'ludo_queues',          to_regclass('public.ludo_queues')        IS NOT NULL),
    (11, 'table',  'ludo_rooms',           to_regclass('public.ludo_rooms')         IS NOT NULL),
    (12, 'table',  'ludo_match_history',   to_regclass('public.ludo_match_history') IS NOT NULL),
    (13, 'table',  'ludo_stats',           to_regclass('public.ludo_stats')         IS NOT NULL),
    (14, 'table',  'ludo_bot_profiles',    to_regclass('public.ludo_bot_profiles')  IS NOT NULL),
    (15, 'table',  'ludo_reactions',       to_regclass('public.ludo_reactions')     IS NOT NULL),
    (16, 'table',  'ludo_settlements',     to_regclass('public.ludo_settlements')   IS NOT NULL),

    -- columns
    (20, 'column', 'ludo_rooms.match_start_time',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='ludo_rooms' AND column_name='match_start_time')),
    (21, 'column', 'ludo_rooms.consecutive_sixes',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='ludo_rooms' AND column_name='consecutive_sixes')),
    (22, 'column', 'wallets.won_coins_balance',
         EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='wallets' AND column_name='won_coins_balance')),

    -- RPCs the code calls
    (30, 'rpc', 'join_ludo_queue(uuid,integer)',         to_regprocedure('public.join_ludo_queue(uuid,integer)') IS NOT NULL),
    (31, 'rpc', 'cancel_ludo_queue(uuid,uuid)',          to_regprocedure('public.cancel_ludo_queue(uuid,uuid)') IS NOT NULL),
    (32, 'rpc', 'match_ludo_queue(uuid,uuid)',           to_regprocedure('public.match_ludo_queue(uuid,uuid)') IS NOT NULL),
    (33, 'rpc', 'activate_ludo_room(uuid)',              to_regprocedure('public.activate_ludo_room(uuid)') IS NOT NULL),
    (34, 'rpc', 'advance_ludo_turn(...)',                to_regprocedure('public.advance_ludo_turn(uuid,text,timestamptz,text,integer,integer)') IS NOT NULL),
    (35, 'rpc', 'append_ludo_reaction(uuid,jsonb,int)',  to_regprocedure('public.append_ludo_reaction(uuid,jsonb,integer)') IS NOT NULL),
    (36, 'rpc', 'settle_ludo_match(...)',                to_regprocedure('public.settle_ludo_match(uuid,text,text,text,integer)') IS NOT NULL),
    (37, 'rpc', 'ludo_janitor()',                        to_regprocedure('public.ludo_janitor()') IS NOT NULL),

    -- race guards
    (40, 'index', 'uq_ludo_queues_one_waiting_per_user', EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ludo_queues_one_waiting_per_user')),
    (41, 'index', 'uq_ludo_rooms_one_live_p1',           EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ludo_rooms_one_live_p1')),
    (42, 'index', 'uq_ludo_bot_profiles_name',           EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='uq_ludo_bot_profiles_name')),

    -- security: anon must NOT be able to call the money RPCs
    (50, 'security', 'anon cannot execute settle_ludo_match',
         NOT has_function_privilege('anon', 'public.settle_ludo_match(uuid,text,text,text,integer)', 'EXECUTE')),
    (51, 'security', 'anon cannot execute join_ludo_queue',
         NOT has_function_privilege('anon', 'public.join_ludo_queue(uuid,integer)', 'EXECUTE')),
    (52, 'security', 'authenticated cannot execute match_ludo_queue',
         NOT has_function_privilege('authenticated', 'public.match_ludo_queue(uuid,uuid)', 'EXECUTE')),
    (53, 'security', 'service_role can execute settle_ludo_match',
         has_function_privilege('service_role', 'public.settle_ludo_match(uuid,text,text,text,integer)', 'EXECUTE')),

    -- data
    (60, 'data', 'at least one active bot profile',
         EXISTS (SELECT 1 FROM public.ludo_bot_profiles WHERE active = true)),
    (61, 'data', 'no duplicate bot names',
         NOT EXISTS (SELECT bot_name FROM public.ludo_bot_profiles GROUP BY bot_name HAVING count(*) > 1)),
    (62, 'data', 'no duplicate waiting queue entries',
         NOT EXISTS (SELECT user_id FROM public.ludo_queues WHERE status='waiting' GROUP BY user_id HAVING count(*) > 1)),

    -- cron
    (70, 'cron', 'pg_cron extension enabled',
         EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')),
    -- cron.job is referenced through a dynamic query so this file still parses
    -- when pg_cron is not installed (Postgres validates every table at plan time).
    (71, 'cron', 'ludo_janitor_every_minute scheduled',
         public._ludo_verify_cron_scheduled())
)
SELECT
    category,
    item,
    CASE WHEN ok THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM checks
ORDER BY ord;

-- Live snapshot (should normally be small numbers):
SELECT
    (SELECT count(*) FROM public.ludo_queues WHERE status = 'waiting')                       AS waiting_in_queue,
    (SELECT count(*) FROM public.ludo_rooms  WHERE status = 'countdown')                     AS rooms_countdown,
    (SELECT count(*) FROM public.ludo_rooms  WHERE status = 'active')                        AS rooms_active,
    (SELECT count(*) FROM public.ludo_rooms  WHERE status = 'active'
                                              AND updated_at < now() - interval '12 minutes') AS rooms_active_stale,
    (SELECT count(*) FROM public.ludo_bot_profiles WHERE active)                             AS active_bots;

DROP FUNCTION IF EXISTS public._ludo_verify_cron_scheduled();
