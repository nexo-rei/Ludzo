-- ============================================================================
-- LUDZO — 03_ludo_cron.sql
-- ============================================================================
-- Server-side janitor for the Ludo tables. The game engine only advances when
-- SOMEBODY polls /api/ludo/room/state — so if both players close the app, a
-- room sits in 'active' forever and both stakes stay escrowed. Same for a
-- queue entry whose owner closed the app while the radar was spinning.
--
-- This installs ONE function (ludo_janitor) and schedules it every minute with
-- pg_cron. Everything it does is also safe to run by hand:
--
--     SELECT public.ludo_janitor();
--
-- Idempotent + transactional. Run after 02_ludo_fixes.sql.
--
-- pg_cron: Supabase → Database → Extensions → enable "pg_cron" (free tier ok).
-- If the extension is unavailable this file still installs the function and
-- just prints a NOTICE — you can call it from an external cron / Edge Function.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Janitor function
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ludo_janitor()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Tunables. Keep in sync with lib/ludo-engine.ts + the queue UI.
    QUEUE_STALE_SECS     CONSTANT integer := 180;   -- no poll for 3 min → refund + cancel
    COUNTDOWN_STALE_SECS CONSTANT integer := 300;   -- never activated in 5 min → refund both
    ACTIVE_STALE_SECS    CONSTANT integer := 720;   -- 8 min match + 4 min grace, nobody polling
    TURN_TIMEOUT_SECS    CONSTANT integer := 18;

    r               RECORD;
    v_refunded_q    integer := 0;
    v_voided_rooms  integer := 0;
    v_settled_rooms integer := 0;
    v_winner        text;
    v_loser         text;
    v_dur           integer;
BEGIN
    -- ── A. Abandoned queue entries → cancel + refund ────────────────────────
    -- A live client is matched with a bot after 20 s, so any entry still
    -- 'waiting' QUEUE_STALE_SECS after joining belongs to a client that died
    -- (closed Telegram, lost network) before its match could be made.
    -- NOTE: joined_at, not updated_at — the set_updated_at trigger rewrites
    -- updated_at on every UPDATE, so it is not a reliable "last seen".
    FOR r IN
        SELECT id, user_id, stake
        FROM   public.ludo_queues
        WHERE  status = 'waiting'
          AND  joined_at < now() - make_interval(secs => QUEUE_STALE_SECS)
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.ludo_queues
        SET    status = 'cancelled', updated_at = now()
        WHERE  id = r.id;

        UPDATE public.wallets
        SET    coin_balance = coin_balance + r.stake, updated_at = now()
        WHERE  user_id = r.user_id;

        v_refunded_q := v_refunded_q + 1;
    END LOOP;

    -- ── B. Rooms stuck in 'countdown' → void + refund both humans ───────────
    -- Nobody ever opened the room (both clients died between "match found"
    -- and the first state poll). No game happened, so nobody wins: refund.
    FOR r IN
        SELECT id, stake, player_1_id, player_2_id
        FROM   public.ludo_rooms
        WHERE  status = 'countdown'
          AND  created_at < now() - make_interval(secs => COUNTDOWN_STALE_SECS)
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.wallets
        SET    coin_balance = coin_balance + r.stake, updated_at = now()
        WHERE  user_id = r.player_1_id;

        IF r.player_2_id NOT LIKE 'bot_%' THEN
            UPDATE public.wallets
            SET    coin_balance = coin_balance + r.stake, updated_at = now()
            WHERE  user_id = r.player_2_id::uuid;
        END IF;

        UPDATE public.ludo_rooms
        SET    status     = 'completed',
               win_reason = 'timeout',
               winner_id  = NULL,
               loser_id   = NULL,
               updated_at = now()
        WHERE  id = r.id;

        INSERT INTO public.ludo_settlements
            (room_id, stake, pool, reward, platform_fee, bot_match, winner_id, loser_id, win_reason)
        VALUES
            (r.id, r.stake, r.stake * 2, 0, 0, r.player_2_id LIKE 'bot_%', 'void', 'void', 'timeout')
        ON CONFLICT (room_id) DO NOTHING;

        v_voided_rooms := v_voided_rooms + 1;
    END LOOP;

    -- ── C. Abandoned 'active' rooms → settle against the player on turn ─────
    -- Nobody has polled for ACTIVE_STALE_SECS. The engine's own rule is "you
    -- lose your turn/hearts if you don't act", so the fairest deterministic
    -- outcome is: the player whose turn it was (and who never acted) forfeits.
    -- Uses settle_ludo_match so history/stats/payout stay consistent.
    FOR r IN
        SELECT id, player_1_id, player_2_id, turn_player_id, match_start_time, created_at
        FROM   public.ludo_rooms
        WHERE  status = 'active'
          AND  updated_at < now() - make_interval(secs => ACTIVE_STALE_SECS)
        FOR UPDATE SKIP LOCKED
    LOOP
        v_loser  := r.turn_player_id;
        v_winner := CASE WHEN v_loser = r.player_1_id::text THEN r.player_2_id ELSE r.player_1_id::text END;
        v_dur    := GREATEST(0, floor(extract(epoch from (now() - COALESCE(r.match_start_time, r.created_at))))::integer);

        PERFORM public.settle_ludo_match(r.id, v_winner, v_loser, 'timeout', v_dur);
        v_settled_rooms := v_settled_rooms + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'queue_refunded',  v_refunded_q,
        'rooms_voided',    v_voided_rooms,
        'rooms_settled',   v_settled_rooms,
        'ran_at',          now()
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ludo_janitor() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.ludo_janitor() TO service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Schedule it (every minute)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Replace any previous schedule with the same name.
        PERFORM cron.unschedule(jobid)
        FROM   cron.job
        WHERE  jobname = 'ludo_janitor_every_minute';

        PERFORM cron.schedule(
            'ludo_janitor_every_minute',
            '* * * * *',
            $job$ SELECT public.ludo_janitor(); $job$
        );
        RAISE NOTICE 'pg_cron job "ludo_janitor_every_minute" scheduled.';
    ELSE
        RAISE NOTICE 'pg_cron is not enabled. Enable it under Database → Extensions, then re-run this file, '
                     'or call SELECT public.ludo_janitor(); from an external scheduler.';
    END IF;
END $$;

COMMIT;

-- Check it is scheduled:
--   SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'ludo_janitor_every_minute';
-- See recent runs:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
