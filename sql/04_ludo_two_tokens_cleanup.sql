-- ═══════════════════════════════════════════════════════════════════════════
-- LUDZO — 04: TWO-TOKEN BOARDS + ONE-SHOT CLEANUP  (Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- Kab run karein: 02 aur 03 ke BAAD, ek baar. Idempotent — dobara chalao toh
-- bhi safe hai.
--
-- Kya karta hai:
--   1. Naye Ludo rooms ab 2 tokens per player ke saath bante hain
--      (total 2+2). Dono tokens home pahunchane wala jeetta hai.
--   2. ludo_janitor() ko EK BAAR manually chala deta hai — isse abhi DB me
--      pade stuck 'waiting' queue rows (stake refund ho jaata hai) aur
--      stale 'active' rooms settle ho jaate hain.
--   3. pg_cron job ensure karta hai (har minute janitor chale).
--
-- Purane 4-token rooms jo abhi live hain, wo bhi theise chalte rahenge
-- (engine length-generic hai) — sirf naye rooms 2-token bante hain.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. RPC: match_ludo_queue — same as 02, but fresh boards are 2-token
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_ludo_queue(
    p_queue_id uuid,
    p_user_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    BOT_AFTER_SECS CONSTANT integer := 20;

    v_me         public.ludo_queues%ROWTYPE;
    v_opp        public.ludo_queues%ROWTYPE;
    v_room_id    uuid;
    v_bot        public.ludo_bot_profiles%ROWTYPE;
    v_bot_id     text;
    v_waited     integer;
    v_first      text;
    v_board      jsonb;
BEGIN
    -- 1. My own entry, locked.
    SELECT * INTO v_me
    FROM   public.ludo_queues
    WHERE  id = p_queue_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('matched', false, 'cancelled', true, 'reason', 'queue entry not found');
    END IF;

    IF v_me.status = 'matched' AND v_me.room_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'matched',    true,
            'room_id',    v_me.room_id,
            'match_type', 'human',
            'opponent_id', (SELECT CASE WHEN r.player_1_id = p_user_id THEN r.player_2_id ELSE r.player_1_id::text END
                            FROM public.ludo_rooms r WHERE r.id = v_me.room_id)
        );
    END IF;

    IF v_me.status <> 'waiting' THEN
        RETURN jsonb_build_object('matched', false, 'cancelled', true);
    END IF;

    -- Empty board for a fresh room. Positions: 0 = yard, 1..51 track, 52..56 lane, 57 home.
    v_board := jsonb_build_object(
        'pieces', jsonb_build_object(
            'player_1', '[0,0]'::jsonb,
            'player_2', '[0,0]'::jsonb
        )
    );

    -- 2. Real opponent?
    SELECT * INTO v_opp
    FROM   public.ludo_queues
    WHERE  status  = 'waiting'
      AND  stake   = v_me.stake
      AND  user_id <> p_user_id
      AND  id      <> p_queue_id
    ORDER  BY joined_at ASC
    LIMIT  1
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
        -- The player who waited longer is player_1 (red, moves first).
        INSERT INTO public.ludo_rooms
            (stake, player_1_id, player_2_id, status, board_state,
             turn_player_id, turn_start_at, created_at)
        VALUES
            (v_me.stake, v_opp.user_id, p_user_id::text, 'countdown', v_board,
             v_opp.user_id::text, now(), now())
        RETURNING id INTO v_room_id;

        UPDATE public.ludo_queues
        SET    status = 'matched', room_id = v_room_id, updated_at = now()
        WHERE  id IN (p_queue_id, v_opp.id);

        RETURN jsonb_build_object(
            'matched',     true,
            'room_id',     v_room_id,
            'opponent_id', v_opp.user_id::text,
            'match_type',  'human'
        );
    END IF;

    -- 3. Bot fallback after the wait threshold.
    v_waited := GREATEST(0, floor(extract(epoch from (now() - v_me.joined_at)))::integer);

    IF v_waited < BOT_AFTER_SECS THEN
        RETURN jsonb_build_object('matched', false, 'waiting_secs', v_waited);
    END IF;

    SELECT * INTO v_bot
    FROM   public.ludo_bot_profiles
    WHERE  active = true
    ORDER  BY random()
    LIMIT  1;

    IF NOT FOUND THEN
        -- No bots seeded: keep the human waiting rather than failing the poll.
        RETURN jsonb_build_object('matched', false, 'waiting_secs', v_waited, 'reason', 'no active bots');
    END IF;

    -- Bot ids are 'bot_<uuid>' — every route keys off the 'bot_' prefix.
    v_bot_id := 'bot_' || v_bot.id::text;

    INSERT INTO public.ludo_rooms
        (stake, player_1_id, player_2_id, status, board_state,
         turn_player_id, turn_start_at, created_at)
    VALUES
        (v_me.stake, p_user_id, v_bot_id, 'countdown',
         v_board || jsonb_build_object(
             'bot_profile', jsonb_build_object(
                 'name',        v_bot.bot_name,
                 'avatar',      COALESCE(v_bot.avatar, 'https://api.dicebear.com/7.x/adventurer/svg?seed=' || v_bot.id::text),
                 'skill_level', v_bot.skill_level
             )
         ),
         p_user_id::text, now(), now())
    RETURNING id INTO v_room_id;

    UPDATE public.ludo_queues
    SET    status = 'matched', room_id = v_room_id, updated_at = now()
    WHERE  id = p_queue_id;

    RETURN jsonb_build_object(
        'matched',     true,
        'room_id',     v_room_id,
        'opponent_id', v_bot_id,
        'match_type',  'bot'
    );
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────

-- Privileges & search_path pin (same as 02)
REVOKE EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_ludo_room(uuid)     FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid) TO service_role;
GRANT  EXECUTE ON FUNCTION public.activate_ludo_room(uuid)     TO service_role;
ALTER FUNCTION public.match_ludo_queue(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.activate_ludo_room(uuid)     SET search_path = public;
CREATE OR REPLACE FUNCTION public.activate_ludo_room(p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room  public.ludo_rooms%ROWTYPE;
    v_first text;
BEGIN
    SELECT * INTO v_room
    FROM   public.ludo_rooms
    WHERE  id = p_room_id
    FOR UPDATE;

    IF NOT FOUND OR v_room.status <> 'countdown' THEN
        RETURN false;
    END IF;

    -- Fair coin flip for first move — no fixed player_1 advantage.
    v_first := CASE WHEN random() < 0.5 THEN v_room.player_1_id::text ELSE v_room.player_2_id END;

    UPDATE public.ludo_rooms
    SET    status            = 'active',
           match_start_time  = now(),
           turn_player_id    = v_first,
           turn_start_at     = now(),
           dice_rolled       = false,
           last_roll         = 0,
           movable_pieces    = '{}'::integer[],
           consecutive_sixes = 0,
           hearts_player_1   = 3,
           hearts_player_2   = 3,
           board_state       = CASE
                                   WHEN v_room.board_state ? 'pieces' THEN v_room.board_state
                                   ELSE v_room.board_state || jsonb_build_object(
                                       'pieces', jsonb_build_object(
                                           'player_1', '[0,0]'::jsonb,
                                           'player_2', '[0,0]'::jsonb))
                               END,
           updated_at        = now()
    WHERE  id = p_room_id;

    RETURN true;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- 2. ONE-SHOT CLEANUP — stuck queue rows refund + stale rooms settle
-- ────────────────────────────────────────────────────────────────────────────
-- waiting_in_queue / rooms_active_stale jo 99_verify me dikhe the, ye unhe
-- saaf kar dega: >180s purani 'waiting' rows ka stake refund, >720s purane
-- 'active' rooms ka fair settlement.
SELECT public.ludo_janitor() AS janitor_result;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. pg_cron job (re)ensure — janitor har minute chalega
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
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
        RAISE NOTICE 'pg_cron enabled nahi hai. Supabase Dashboard → Database → Extensions → pg_cron ON karo, phir ye file dobara chalao.';
    END IF;
END $$;

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. VERIFY (read-only) — ye chalake dekho ki sab saaf ho gaya:
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT count(*) AS waiting_in_queue   FROM public.ludo_queues WHERE status = 'waiting';
-- SELECT count(*) AS rooms_countdown    FROM public.ludo_rooms WHERE status = 'countdown';
-- SELECT count(*) AS rooms_active       FROM public.ludo_rooms WHERE status = 'active';
-- SELECT count(*) AS rooms_active_stale FROM public.ludo_rooms WHERE status = 'active'
--        AND updated_at < now() - interval '720 seconds';
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'ludo_janitor_every_minute';
