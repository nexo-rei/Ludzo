-- ============================================================================
-- LUDZO — DATABASE DIAGNOSTIC SCRIPT
-- ----------------------------------------------------------------------------
-- Isko Supabase Dashboard → SQL Editor me paste karke RUN karo.
-- Ye kuch MODIFY nahi karta — sirf SELECT / read-only checks hai.
-- Poora output copy karke mujhe bhej dena.
--
-- Har section ek numbered finding hai jo AUDIT.md se map hota hai.
-- ============================================================================


-- ============================================================================
-- [B1] KYA WO 3 RPC FUNCTIONS DB ME EXIST KARTE HAI?
--      Expected: 7 rows. Agar koi row missing hai -> wo RPC gayab hai.
-- ============================================================================
SELECT f.routine_name                                    AS function_name,
       pg_get_function_identity_arguments(p.oid)         AS args,
       p.prosecdef                                       AS security_definer,
       p.proconfig                                       AS search_path_setting
FROM   information_schema.routines f
JOIN   pg_proc       p ON p.proname  = f.routine_name
JOIN   pg_namespace  n ON n.oid      = p.pronamespace AND n.nspname = 'public'
WHERE  f.routine_schema = 'public'
  AND  f.routine_name IN (
        'join_ludo_queue',        -- schema me hai
        'cancel_ludo_queue',      -- schema me hai
        'settle_ludo_match',      -- schema me hai
        'update_ludo_stats',      -- schema me hai
        'match_ludo_queue',       -- *** CODE CALL KARTA HAI, SCHEMA ME NAHI ***
        'activate_ludo_room',     -- *** CODE CALL KARTA HAI, SCHEMA ME NAHI ***
        'advance_ludo_turn',      -- *** CODE CALL KARTA HAI, SCHEMA ME NAHI ***
        'credit_coins', 'debit_coins', 'credit_usdt', 'debit_usdt',
        'get_leaderboard', 'get_user_rank'
       )
ORDER  BY f.routine_name;


-- ============================================================================
-- [B1b] BASE TABLES — kaunsi exist karti hai, kaunsi nahi?
--        Code 20 tables reference karta hai. MISSING walon pe dhyan do.
-- ============================================================================
WITH required(t) AS (VALUES
  ('users'),('wallets'),('transactions'),('deposits'),('withdrawals'),
  ('tasks'),('user_tasks'),('referrals'),('daily_streaks'),('ad_logs'),
  ('announcements'),('settings'),('admin_users'),('admin_logs'),('user_preferences'),
  ('ludo_queues'),('ludo_rooms'),('ludo_match_history'),('ludo_stats'),
  ('ludo_bot_profiles'),('ludo_room_states'),('ludo_reactions')
)
SELECT r.t                                                          AS table_name,
       CASE WHEN c.relname IS NULL THEN '❌ MISSING' ELSE '✅ exists' END AS status
FROM   required r
LEFT   JOIN pg_class c
       ON c.relname = r.t AND c.relkind = 'r'
      AND c.relnamespace = 'public'::regnamespace
ORDER  BY status DESC, r.t;


-- ============================================================================
-- [B2] ludo_rooms ke REQUIRED COLUMNS — match_start_time / consecutive_sixes
--        Inke bina /api/ludo/room/state aur /forfeit 500 dete hai (error 42703).
-- ============================================================================
SELECT a.attname                                        AS column_name,
       format_type(a.atttypid, a.atttypmod)             AS data_type,
       a.attnotnull                                     AS not_null
FROM   pg_attribute a
WHERE  a.attrelid = 'public.ludo_rooms'::regclass
  AND  a.attnum > 0 AND NOT a.attisdropped
ORDER  BY a.attnum;

-- Sirf missing columns dikhao (result = 2 rows hona chahiye, warna 0):
SELECT x.col AS missing_column
FROM  (VALUES ('match_start_time'), ('consecutive_sixes')) AS x(col)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema='public' AND c.table_name='ludo_rooms' AND c.column_name=x.col
);


-- ============================================================================
-- [C2] 🔴 SABSE KHATARNAK CHECK — kaun se SECURITY DEFINER functions
--        PUBLIC/anon ko execute karne ki chhut dete hai?
--        Agar ye query koi row return kare -> koi bhi anon key se wo function
--        call karke kisi ka bhi wallet drain / khud ko winner declare kar sakta hai.
-- ============================================================================
SELECT p.proname                                        AS function_name,
       pg_get_function_identity_arguments(p.oid)        AS args,
       p.prosecdef                                      AS is_security_definer,
       p.proconfig                                      AS search_path,   -- NULL = ⚠️ mutable search_path
       array_to_string(
         ARRAY(SELECT privilege_type
               FROM   information_schema.routine_privileges rp
               WHERE  rp.specific_schema = 'public'
                 AND  rp.specific_name   LIKE p.proname || '%'
                 AND  rp.grantee IN ('PUBLIC','anon','authenticated')),
         ', ')                                          AS granted_to
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public'
  AND  p.prosecdef = true
ORDER  BY p.proname;


-- ============================================================================
-- [C2b] wallets ko chhune wale functions — inka owner kaun hai?
--        SECURITY DEFINER + owner=postgres + PUBLIC execute = full money exploit
-- ============================================================================
SELECT p.proname                              AS function_name,
       r.rolname                              AS owner,
       p.prosecdef                            AS security_definer,
       p.proacl::text                         AS acl
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
JOIN   pg_roles     r ON r.oid = p.proowner
WHERE  n.nspname = 'public'
  AND  p.prokind = 'f'                              -- sirf plain functions (aggregate pe pg_get_functiondef fail hota hai)
  AND  pg_get_functiondef(p.oid) ILIKE '%wallets%'
ORDER  BY p.proname;


-- ============================================================================
-- [B4 / C4] 🔴 ATKA HUA PAISA — ye sabse important business check hai
-- ============================================================================

-- (a) 'countdown' me fase rooms (10 second me activate hone chahiye the)
SELECT COUNT(*)                                        AS stuck_in_countdown,
       MIN(created_at)                                 AS oldest,
       now() - MIN(created_at)                         AS oldest_age,
       SUM(stake * 2)                                  AS coins_locked
FROM   ludo_rooms
WHERE  status = 'countdown'
  AND  created_at < now() - interval '1 minute';

-- (b) 'active' me fase rooms jahan koi update nahi ho raha (dono player chale gaye)
SELECT COUNT(*)                                        AS abandoned_active_rooms,
       SUM(stake * 2)                                  AS coins_locked,
       MIN(updated_at)                                 AS oldest_update
FROM   ludo_rooms
WHERE  status = 'active'
  AND  updated_at < now() - interval '10 minutes';

-- (c) 'waiting' queue entries jinme coins deduct ho chuke hai par match nahi mila
SELECT COUNT(*)                                        AS stuck_queue_entries,
       SUM(stake)                                      AS coins_locked,
       MIN(joined_at)                                  AS oldest,
       now() - MIN(joined_at)                          AS oldest_age
FROM   ludo_queues
WHERE  status = 'waiting'
  AND  joined_at < now() - interval '5 minutes';

-- (d) 'matched' queue entries jo kabhi close nahi hui (settle_ludo_match inhe touch nahi karta)
SELECT status, COUNT(*) AS n, MIN(joined_at) AS oldest
FROM   ludo_queues
GROUP  BY status
ORDER  BY status;


-- ============================================================================
-- [C3] DUPLICATE QUEUE ENTRIES — race condition ka saboot
--        Agar koi row aaye -> user se double stake deduct hua hai.
-- ============================================================================
SELECT user_id, stake, COUNT(*) AS duplicate_waiting_entries,
       array_agg(id)      AS queue_ids,
       array_agg(joined_at) AS joined_at
FROM   ludo_queues
WHERE  status = 'waiting'
GROUP  BY user_id, stake
HAVING COUNT(*) > 1;

-- Aur: ek user, kai alag stakes me ek saath waiting (design me allowed hai? socho)
SELECT user_id, COUNT(*) AS simultaneous_queues, SUM(stake) AS total_locked
FROM   ludo_queues
WHERE  status = 'waiting'
GROUP  BY user_id
HAVING COUNT(*) > 1;


-- ============================================================================
-- [C5] SETTLE INTEGRITY — winner/loser actually room ke players hai bhi ya nahi?
--        settle_ludo_match me ye validation nahi hai, to exploit ke traces yaha milenge.
-- ============================================================================
SELECT r.id                                            AS room_id,
       r.status,
       r.winner_id, r.loser_id,
       r.player_1_id::text AS p1, r.player_2_id AS p2,
       r.win_reason,
       r.updated_at,
       CASE
         WHEN r.winner_id IS NULL OR r.loser_id IS NULL THEN 'settled but winner/loser NULL'
         WHEN r.winner_id = r.loser_id                  THEN 'winner == loser'
         ELSE 'winner/loser are NOT the room players'
       END                                             AS problem
FROM   ludo_rooms r
WHERE  r.status IN ('completed','forfeited')
  AND  ( r.winner_id IS NULL
      OR r.loser_id   IS NULL
      OR r.winner_id  = r.loser_id
      OR r.winner_id NOT IN (r.player_1_id::text, r.player_2_id)
      OR r.loser_id   NOT IN (r.player_1_id::text, r.player_2_id) );

-- Bot jeeta -> kitne coins economy se gayab hue (reward kisi ko mila hi nahi)
SELECT COUNT(*)                    AS bot_wins,
       SUM(stake * 2)              AS coins_destroyed,
       SUM(floor(stake*2*0.98))    AS coins_the_house_kept
FROM   ludo_rooms
WHERE  status IN ('completed','forfeited')
  AND  winner_id LIKE 'bot_%';


-- ============================================================================
-- [C5b] LEDGER DRIFT — wallets ka balance transactions se match karta hai?
--        ⚠️ 'transactions' table tumhare base schema me hai (repo me nahi),
--           isliye column names alag ho sakte hai. Ye section ek DO-block hai
--           jo pehle columns check karta hai, phir result NOTICE me print karta
--           hai (Supabase me "Messages" tab me dikhega). Isse script abort nahi hogi.
-- ============================================================================
SELECT column_name, data_type
FROM   information_schema.columns
WHERE  table_schema='public' AND table_name='transactions'
ORDER  BY ordinal_position;
-- ^ Agar 0 rows -> transactions table hi nahi hai -> game ke paise ka KOI audit trail nahi.

DO $$
DECLARE
  rec  RECORD;
  n    integer := 0;
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE NOTICE '[C5b] ❌ public.transactions table DOES NOT EXIST — no ledger for game money';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='transactions'
                   AND column_name IN ('user_id')) THEN
    RAISE NOTICE '[C5b] ⚠️ transactions me user_id column nahi mila — drift check skip';
    RETURN;
  END IF;

  -- transaction types ka breakdown (game ke types dikhte hai ya nahi?)
  FOR rec IN
    SELECT COALESCE(type,'(null)') AS t, COUNT(*) AS c
    FROM   transactions GROUP BY type ORDER BY c DESC
  LOOP
    RAISE NOTICE '[C5b] transaction type=% count=%', rec.t, rec.c;
  END LOOP;

  -- wallet vs ledger drift (top 20)
  FOR rec IN
    SELECT w.user_id, w.coin_balance, COALESCE(t.s,0) AS ledger,
           w.coin_balance - COALESCE(t.s,0) AS drift
    FROM   wallets w
    LEFT   JOIN (SELECT user_id, SUM(amount) AS s FROM transactions GROUP BY user_id) t
           ON t.user_id = w.user_id
    WHERE  ABS(w.coin_balance - COALESCE(t.s,0)) > 0
    ORDER  BY ABS(w.coin_balance - COALESCE(t.s,0)) DESC
    LIMIT  20
  LOOP
    n := n + 1;
    RAISE NOTICE '[C5b] DRIFT user=% wallet=% ledger=% drift=%',
                 rec.user_id, rec.coin_balance, rec.ledger, rec.drift;
  END LOOP;

  IF n = 0 THEN
    RAISE NOTICE '[C5b] ✅ no drift detected (ya amount column signed nahi hai — check karo)';
  ELSE
    RAISE NOTICE '[C5b] ❌ % wallets with drift', n;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[C5b] ⚠️ drift check failed: % (column names adjust karo)', SQLERRM;
END;
$$;
-- ^ Agar yaha 'ludo_stake' / 'ludo_reward' jaisa koi type NAHI aaya ->
--   confirm: settle_ludo_match aur join_ludo_queue ledger entry nahi likhte.


-- ============================================================================
-- [C5c] STATS vs HISTORY consistency
-- ============================================================================
SELECT s.user_id,
       s.wins,   s.losses, s.total_matches, s.win_rate,
       h.wins   AS hist_wins,
       h.losses AS hist_losses,
       h.n      AS hist_rows
FROM   ludo_stats s
LEFT   JOIN (
        SELECT user_id,
               COUNT(*) FILTER (WHERE result='win')  AS wins,
               COUNT(*) FILTER (WHERE result='loss') AS losses,
               COUNT(*)                              AS n
        FROM   ludo_match_history
        GROUP  BY user_id
       ) h ON h.user_id = s.user_id
WHERE  s.wins        <> COALESCE(h.wins,0)
   OR  s.losses      <> COALESCE(h.losses,0)
   OR  s.total_matches <> COALESCE(h.n,0)
LIMIT  50;

-- win_rate TEXT me store hai -> galat values
SELECT user_id, wins, total_matches, win_rate,
       round((wins::numeric / NULLIF(total_matches,0)::numeric) * 100)::text || '%' AS should_be
FROM   ludo_stats
WHERE  total_matches > 0
  AND  win_rate <> round((wins::numeric / NULLIF(total_matches,0)::numeric)*100)::text || '%'
LIMIT  50;


-- ============================================================================
-- [H3] DUPLICATE BOT SEEDS — migration dobara chalane pe ye badh jaate hai
-- ============================================================================
SELECT bot_name, COUNT(*) AS copies
FROM   ludo_bot_profiles
GROUP  BY bot_name
HAVING COUNT(*) > 1;

SELECT id, bot_name, avatar, skill_level, active, created_at
FROM   ludo_bot_profiles
ORDER  BY created_at;


-- ============================================================================
-- [RLS] Row Level Security status + policies
-- ============================================================================
SELECT c.relname                                        AS table_name,
       c.relrowsecurity                                 AS rls_enabled,
       c.relforcerowsecurity                            AS rls_forced,
       (SELECT COUNT(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS policy_count
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relkind = 'r'
  AND  c.relname LIKE 'ludo%'
ORDER  BY c.relname;

SELECT tablename, policyname, cmd, roles::text, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
ORDER  BY tablename, policyname;

-- ⚠️ RLS enabled par ZERO policies = koi authenticated user kuch nahi padh sakta
--    (aur service-role sab bypass karta hai) — isliye app "kabhi kaam karti hai
--     kabhi nahi" lagti hai.


-- ============================================================================
-- [INDEXES] game ke hot paths pe index hai ya nahi
-- ============================================================================
SELECT tablename, indexname, indexdef
FROM   pg_indexes
WHERE  schemaname = 'public' AND tablename LIKE 'ludo%'
ORDER  BY tablename, indexname;
-- ^ Chahiye: ludo_rooms(status, turn_player_id), ludo_rooms(updated_at) for sweep


-- ============================================================================
-- [G9] ludo_room_states — dead table? unique index insert fail karega
-- ============================================================================
SELECT COUNT(*) AS snapshot_rows FROM ludo_room_states;
SELECT room_id, COUNT(*) FROM ludo_room_states GROUP BY room_id HAVING COUNT(*) > 1;


-- ============================================================================
-- [LIVE SNAPSHOT] abhi ki state — ye output mujhe bhej dena
-- ============================================================================
SELECT 'rooms'    AS what, status AS bucket, COUNT(*) AS n, SUM(stake*2) AS coins FROM ludo_rooms    GROUP BY status
UNION ALL
SELECT 'queues',        status,        COUNT(*),      SUM(stake)          FROM ludo_queues         GROUP BY status
UNION ALL
SELECT 'history',       result,        COUNT(*),      SUM(reward)         FROM ludo_match_history  GROUP BY result
ORDER  BY what, bucket;

-- Sabse recent 20 rooms (actual gameplay ka postmortem)
SELECT id, stake, status, win_reason,
       player_1_id::text AS p1, player_2_id AS p2,
       turn_player_id, dice_rolled, last_roll, movable_pieces,
       hearts_player_1, hearts_player_2,
       score_player_1, score_player_2,
       board_state -> 'pieces' AS pieces,
       created_at, turn_start_at, updated_at,
       EXTRACT(EPOCH FROM (updated_at - created_at))::int AS age_secs
FROM   ludo_rooms
ORDER  BY created_at DESC
LIMIT  20;

-- ============================================================================
-- END OF DIAGNOSTIC
-- ============================================================================
