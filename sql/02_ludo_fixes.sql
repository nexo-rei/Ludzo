-- ============================================================================
-- LUDZO — 02_ludo_fixes.sql
-- ============================================================================
-- Fixes everything the Ludo code calls but the original ludo_schema.sql never
-- created. Without this file the game cannot start:
--
--   • /api/ludo/queue/join   → rpc("match_ludo_queue")   → PGRST202 (missing)
--   • /api/ludo/room/state   → rpc("activate_ludo_room") → PGRST202 (missing)
--                              room stays in 'countdown' forever, Roll disabled
--   • /api/ludo/room/forfeit → select match_start_time   → 42703 (no column)
--   • /api/ludo/room/roll    → update consecutive_sixes  → 42703 (no column)
--
-- Run this ONCE in Supabase → SQL Editor. It is idempotent: every statement is
-- IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT, so running it twice is safe.
-- Wrapped in a transaction: if anything fails, nothing is applied.
--
-- Requires: ludo_schema.sql (01) already applied, and the base tables
--           public.users (id uuid, first_name, photo_url) and
--           public.wallets (user_id uuid, coin_balance int, won_coins_balance int).
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Sanity: refuse to run against a DB that has no ludo tables at all.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.ludo_rooms') IS NULL THEN
        RAISE EXCEPTION 'ludo_rooms does not exist — run sql/01_ludo_schema.sql first';
    END IF;
    IF to_regclass('public.wallets') IS NULL OR to_regclass('public.users') IS NULL THEN
        RAISE EXCEPTION 'public.users / public.wallets missing — base app schema must exist first';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Missing columns on ludo_rooms
-- ────────────────────────────────────────────────────────────────────────────

-- When the match actually started (set by activate_ludo_room). The 8-minute
-- match timer and the "duration" written to ludo_match_history are measured
-- from here, NOT from created_at (which includes the 10 s countdown).
ALTER TABLE public.ludo_rooms
    ADD COLUMN IF NOT EXISTS match_start_time timestamptz;

-- Rolling three sixes in a row forfeits the turn. The roll route persists the
-- running count here; the code tolerates the column being absent, but then the
-- rule silently never fires.
ALTER TABLE public.ludo_rooms
    ADD COLUMN IF NOT EXISTS consecutive_sixes integer NOT NULL DEFAULT 0
        CHECK (consecutive_sixes >= 0 AND consecutive_sixes <= 3);

-- Back-fill existing rows so old active rooms don't look "unstarted".
UPDATE public.ludo_rooms
SET    match_start_time = COALESCE(match_start_time, created_at)
WHERE  status IN ('active', 'completed', 'forfeited')
  AND  match_start_time IS NULL;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Queue double-entry race
-- ────────────────────────────────────────────────────────────────────────────
-- join_ludo_queue() checked "already waiting?" with a SELECT COUNT(*) and then
-- inserted — two simultaneous taps both passed the check and the user was
-- debited twice. A partial unique index makes the second INSERT fail
-- atomically, and the join route already treats that as "already queued".
--
-- If duplicates already exist the index cannot be created, so we first cancel
-- and REFUND every waiting entry except the oldest per user.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT id, user_id, stake
        FROM (
            SELECT id, user_id, stake,
                   row_number() OVER (PARTITION BY user_id ORDER BY joined_at ASC) AS rn
            FROM   public.ludo_queues
            WHERE  status = 'waiting'
        ) d
        WHERE d.rn > 1
    LOOP
        UPDATE public.ludo_queues
        SET    status = 'cancelled', updated_at = now()
        WHERE  id = r.id;

        UPDATE public.wallets
        SET    coin_balance = coin_balance + r.stake, updated_at = now()
        WHERE  user_id = r.user_id;

        RAISE NOTICE 'Refunded duplicate queue entry % (user %, stake %)', r.id, r.user_id, r.stake;
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_queues_one_waiting_per_user
    ON public.ludo_queues (user_id)
    WHERE status = 'waiting';

-- Only one live room per human player as well (player_1 side; player_2 is text
-- because it can be a bot id, so it gets its own partial index).
CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_rooms_one_live_p1
    ON public.ludo_rooms (player_1_id)
    WHERE status IN ('countdown', 'active');

CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_rooms_one_live_p2
    ON public.ludo_rooms (player_2_id)
    WHERE status IN ('countdown', 'active') AND player_2_id NOT LIKE 'bot_%';


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Bot profiles — dedupe + make the seed idempotent
-- ────────────────────────────────────────────────────────────────────────────
-- The original seed used ON CONFLICT DO NOTHING with no unique constraint, so
-- every re-run of ludo_schema.sql added three more bots.

DELETE FROM public.ludo_bot_profiles a
USING  public.ludo_bot_profiles b
WHERE  a.bot_name = b.bot_name
  AND  a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_bot_profiles_name
    ON public.ludo_bot_profiles (bot_name);

INSERT INTO public.ludo_bot_profiles (bot_name, avatar, skill_level, active) VALUES
    ('Bot Arjun',  'https://api.dicebear.com/7.x/adventurer/svg?seed=arjun',  'easy',   true),
    ('Bot Riya',   'https://api.dicebear.com/7.x/adventurer/svg?seed=riya',   'medium', true),
    ('Bot Vikram', 'https://api.dicebear.com/7.x/adventurer/svg?seed=vikram', 'hard',   true),
    ('Bot Meera',  'https://api.dicebear.com/7.x/adventurer/svg?seed=meera',  'medium', true),
    ('Bot Kabir',  'https://api.dicebear.com/7.x/adventurer/svg?seed=kabir',  'hard',   true)
ON CONFLICT (bot_name) DO UPDATE
    SET avatar = EXCLUDED.avatar
    WHERE public.ludo_bot_profiles.avatar IS NULL
       OR public.ludo_bot_profiles.avatar NOT LIKE 'http%';   -- upgrade old 'bot_x.png' paths


-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC: match_ludo_queue
-- ────────────────────────────────────────────────────────────────────────────
-- Called by /api/ludo/queue/join (right after enqueueing) and by
-- /api/ludo/queue/status (every 1.5 s while the radar spins).
--
-- Returns jsonb:
--   { matched: true,  room_id, opponent_id, match_type: 'human' | 'bot' }
--   { matched: false, waiting_secs }
--   { matched: false, cancelled: true }         (entry was cancelled)
--
-- Semantics:
--   1. Lock MY queue row. If it is no longer 'waiting' but has a room_id, the
--      other side already matched us → return that room (idempotent).
--   2. Look for the OLDEST other 'waiting' entry with the same stake, locking it
--      with FOR UPDATE SKIP LOCKED so two matchers can never grab the same
--      opponent. Both stakes are already escrowed by join_ludo_queue().
--   3. If nobody is there and we've waited ≥ BOT_AFTER_SECS, seat a bot. The
--      bot's stake is virtual (no wallet), which settle_ludo_match handles.
--
-- The room is created in 'countdown'; activate_ludo_room() flips it to 'active'
-- ~10 s later on the first poll that notices.

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
            'player_1', '[0,0,0,0]'::jsonb,
            'player_2', '[0,0,0,0]'::jsonb
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
-- 5. RPC: activate_ludo_room
-- ────────────────────────────────────────────────────────────────────────────
-- countdown → active. Called by /api/ludo/room/state once the 10 s countdown
-- has elapsed. Picks who moves first (random, fair), stamps match_start_time
-- and a FRESH turn_start_at so nobody's first turn starts already expired.
-- Atomic: the WHERE status = 'countdown' guard means concurrent polls from
-- both players can't double-activate.

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
                                           'player_1', '[0,0,0,0]'::jsonb,
                                           'player_2', '[0,0,0,0]'::jsonb))
                               END,
           updated_at        = now()
    WHERE  id = p_room_id;

    RETURN true;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC: advance_ludo_turn
-- ────────────────────────────────────────────────────────────────────────────
-- Compare-and-swap turn switch used by the turn-timeout path in
-- /api/ludo/room/state. Only succeeds if the room is still on the turn the
-- caller observed (same player AND same turn_start_at), so two polls racing
-- the same timeout can only burn ONE heart, not two.
--
-- Returns true when the switch happened, false when someone else already did.

CREATE OR REPLACE FUNCTION public.advance_ludo_turn(
    p_room_id             uuid,
    p_expected_turn       text,
    p_expected_turn_start timestamptz,
    p_next_turn           text,
    p_hearts_p1           integer,
    p_hearts_p2           integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows integer;
BEGIN
    UPDATE public.ludo_rooms
    SET    turn_player_id    = p_next_turn,
           turn_start_at     = now(),
           dice_rolled       = false,
           last_roll         = 0,
           movable_pieces    = '{}'::integer[],
           consecutive_sixes = 0,
           hearts_player_1   = GREATEST(0, p_hearts_p1),
           hearts_player_2   = GREATEST(0, p_hearts_p2),
           updated_at        = now()
    WHERE  id             = p_room_id
      AND  status         = 'active'
      AND  turn_player_id = p_expected_turn
      -- tolerate sub-millisecond serialisation differences between JS and PG
      AND  abs(extract(epoch from (turn_start_at - p_expected_turn_start))) < 0.01;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows = 1;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. RPC: append_ludo_reaction
-- ────────────────────────────────────────────────────────────────────────────
-- Atomic JSONB append for chat_reactions. The route used to read the array,
-- push in JS and write it back — two players reacting within the same poll
-- window overwrote each other and one emote vanished.

CREATE OR REPLACE FUNCTION public.append_ludo_reaction(
    p_room_id  uuid,
    p_reaction jsonb,
    p_keep     integer DEFAULT 20
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.ludo_rooms
    SET    chat_reactions = (
               SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb)
               FROM (
                   SELECT e, ord
                   FROM   jsonb_array_elements(
                              COALESCE(chat_reactions, '[]'::jsonb) || jsonb_build_array(p_reaction)
                          ) WITH ORDINALITY AS t(e, ord)
                   ORDER  BY ord DESC
                   LIMIT  GREATEST(1, p_keep)
               ) last_n
           ),
           updated_at = now()
    WHERE  id = p_room_id;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. settle_ludo_match — harden (idempotent + no-lock-loss + bot pool)
-- ────────────────────────────────────────────────────────────────────────────
-- Same signature as before so all three call sites keep working. Changes:
--   • Re-checks the winner is actually one of the two seated players, so a
--     buggy/forged call can't pay a third party.
--   • Wallet UPDATE is guarded with a row lock so parallel settlements of two
--     different rooms for the same user don't lose an increment.
--   • Records the platform fee and (for bot matches) the unmatched stake in a
--     ludo_settlements audit row, so coins are never silently destroyed.
--   • Duration is clamped ≥ 0 (was violating the CHECK on clock skew).

CREATE TABLE IF NOT EXISTS public.ludo_settlements (
    room_id        uuid        PRIMARY KEY REFERENCES public.ludo_rooms(id) ON DELETE CASCADE,
    stake          integer     NOT NULL,
    pool           integer     NOT NULL,
    reward         integer     NOT NULL,
    platform_fee   integer     NOT NULL,
    bot_match      boolean     NOT NULL DEFAULT false,
    winner_id      text        NOT NULL,
    loser_id       text        NOT NULL,
    win_reason     text        NOT NULL,
    settled_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ludo_settlements ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (server) reads/writes this.

CREATE OR REPLACE FUNCTION public.settle_ludo_match(
    p_room_id    uuid,
    p_winner_id  text,
    p_loser_id   text,
    p_win_reason text,
    p_duration   integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room          public.ludo_rooms%ROWTYPE;
    v_stake         integer;
    v_pool          integer;
    v_reward        integer;
    v_fee           integer;
    v_duration      integer;
    v_winner_uuid   uuid;
    v_loser_uuid    uuid;
    v_winner_name   text;
    v_winner_avatar text;
    v_loser_name    text;
    v_loser_avatar  text;
    v_new_streak    integer;
    v_bot_match     boolean;
BEGIN
    IF p_win_reason NOT IN ('normal', 'forfeit', 'timeout', 'score_timer') THEN
        RAISE EXCEPTION 'Invalid win_reason: %', p_win_reason;
    END IF;

    -- Lock the room; bail out if already settled (idempotent).
    SELECT * INTO v_room
    FROM   public.ludo_rooms
    WHERE  id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;
    IF v_room.status IN ('completed', 'forfeited') THEN
        RETURN false;
    END IF;

    -- Winner/loser must be the two seated players, in either order.
    IF NOT (
        (p_winner_id = v_room.player_1_id::text AND p_loser_id = v_room.player_2_id) OR
        (p_winner_id = v_room.player_2_id       AND p_loser_id = v_room.player_1_id::text)
    ) THEN
        RAISE EXCEPTION 'settle_ludo_match: winner/loser do not match room % seats', p_room_id;
    END IF;

    v_stake     := v_room.stake;
    v_pool      := v_stake * 2;
    v_reward    := floor(v_pool * 0.98)::integer;
    v_fee       := v_pool - v_reward;
    v_duration  := GREATEST(0, COALESCE(p_duration, 0));
    v_bot_match := (v_room.player_2_id LIKE 'bot_%');

    -- Mark room settled.
    UPDATE public.ludo_rooms
    SET    status     = CASE WHEN p_win_reason = 'forfeit' THEN 'forfeited' ELSE 'completed' END,
           winner_id  = p_winner_id,
           loser_id   = p_loser_id,
           win_reason = p_win_reason,
           dice_rolled = false,
           movable_pieces = '{}'::integer[],
           updated_at = now()
    WHERE  id = p_room_id;

    -- Audit row (also gives cron/ledger jobs a single place to look).
    INSERT INTO public.ludo_settlements
        (room_id, stake, pool, reward, platform_fee, bot_match, winner_id, loser_id, win_reason)
    VALUES
        (p_room_id, v_stake, v_pool, v_reward, v_fee, v_bot_match, p_winner_id, p_loser_id, p_win_reason)
    ON CONFLICT (room_id) DO NOTHING;

    -- ── Winner ──────────────────────────────────────────────────────────────
    IF p_winner_id NOT LIKE 'bot_%' THEN
        v_winner_uuid := p_winner_id::uuid;

        PERFORM 1 FROM public.wallets WHERE user_id = v_winner_uuid FOR UPDATE;

        UPDATE public.wallets
        SET    won_coins_balance = won_coins_balance + v_reward,
               updated_at        = now()
        WHERE  user_id = v_winner_uuid;

        SELECT first_name, photo_url INTO v_winner_name, v_winner_avatar
        FROM   public.users WHERE id = v_winner_uuid;
    ELSE
        v_winner_name   := COALESCE(v_room.board_state #>> '{bot_profile,name}',   'Ludo Bot');
        v_winner_avatar := COALESCE(v_room.board_state #>> '{bot_profile,avatar}', '');
    END IF;

    -- ── Loser ───────────────────────────────────────────────────────────────
    IF p_loser_id NOT LIKE 'bot_%' THEN
        v_loser_uuid := p_loser_id::uuid;
        SELECT first_name, photo_url INTO v_loser_name, v_loser_avatar
        FROM   public.users WHERE id = v_loser_uuid;
    ELSE
        v_loser_name   := COALESCE(v_room.board_state #>> '{bot_profile,name}',   'Ludo Bot');
        v_loser_avatar := COALESCE(v_room.board_state #>> '{bot_profile,avatar}', '');
    END IF;

    -- ── Winner history + stats ──────────────────────────────────────────────
    IF v_winner_uuid IS NOT NULL THEN
        INSERT INTO public.ludo_match_history
            (user_id, room_id, opponent_name, opponent_avatar, stake, result, duration, reward, created_at)
        VALUES
            (v_winner_uuid, p_room_id, COALESCE(v_loser_name, 'Opponent'), v_loser_avatar,
             v_stake, 'win', v_duration, v_reward, now());

        INSERT INTO public.ludo_stats (user_id) VALUES (v_winner_uuid)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT current_streak + 1 INTO v_new_streak
        FROM   public.ludo_stats WHERE user_id = v_winner_uuid FOR UPDATE;

        UPDATE public.ludo_stats
        SET    wins            = wins + 1,
               total_matches   = total_matches + 1,
               current_streak  = v_new_streak,
               best_streak     = GREATEST(best_streak, v_new_streak),
               total_won_coins = total_won_coins + v_reward,
               win_rate        = round(((wins + 1)::numeric / (total_matches + 1)::numeric) * 100)::text || '%',
               updated_at      = now()
        WHERE  user_id = v_winner_uuid;
    END IF;

    -- ── Loser history + stats ───────────────────────────────────────────────
    IF v_loser_uuid IS NOT NULL THEN
        INSERT INTO public.ludo_match_history
            (user_id, room_id, opponent_name, opponent_avatar, stake, result, duration, reward, created_at)
        VALUES
            (v_loser_uuid, p_room_id, COALESCE(v_winner_name, 'Opponent'), v_winner_avatar,
             v_stake, 'loss', v_duration, 0, now());

        INSERT INTO public.ludo_stats (user_id) VALUES (v_loser_uuid)
        ON CONFLICT (user_id) DO NOTHING;

        UPDATE public.ludo_stats
        SET    losses         = losses + 1,
               total_matches  = total_matches + 1,
               current_streak = 0,
               win_rate       = round((wins::numeric / (total_matches + 1)::numeric) * 100)::text || '%',
               updated_at     = now()
        WHERE  user_id = v_loser_uuid;
    END IF;

    RETURN true;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 9. join_ludo_queue — block joining while a live room exists
-- ────────────────────────────────────────────────────────────────────────────
-- Same signature. Adds: refuse (with a clear message) if the user already has
-- a countdown/active room, so a second stake can never be escrowed on top of
-- an unfinished match. The join route already redirects on this error.

CREATE OR REPLACE FUNCTION public.join_ludo_queue(
    p_user_id uuid,
    p_stake   integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance  integer;
    v_queue_id uuid;
    v_live     uuid;
BEGIN
    IF p_stake NOT IN (50, 100, 200, 500, 1000, 2000, 5000) THEN
        RAISE EXCEPTION 'Invalid stake value: %. Allowed: 50,100,200,500,1000,2000,5000', p_stake;
    END IF;

    SELECT id INTO v_live
    FROM   public.ludo_rooms
    WHERE  status IN ('countdown', 'active')
      AND  (player_1_id = p_user_id OR player_2_id = p_user_id::text)
    LIMIT  1;

    IF v_live IS NOT NULL THEN
        RAISE EXCEPTION 'You already have a live match (%)', v_live;
    END IF;

    -- Lock wallet row and read balance.
    SELECT coin_balance INTO v_balance
    FROM   public.wallets
    WHERE  user_id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;
    IF v_balance < p_stake THEN
        RAISE EXCEPTION 'Insufficient coins. Required: %, Available: %', p_stake, v_balance;
    END IF;

    -- Escrow the stake.
    UPDATE public.wallets
    SET    coin_balance = coin_balance - p_stake,
           updated_at   = now()
    WHERE  user_id = p_user_id;

    -- The partial unique index turns a double-tap into a clean error here,
    -- and because we're in one transaction the debit above rolls back with it.
    INSERT INTO public.ludo_queues (user_id, stake, status, joined_at)
    VALUES (p_user_id, p_stake, 'waiting', now())
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'User is already waiting in a queue';
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 10. Lock down the SECURITY DEFINER RPCs
-- ────────────────────────────────────────────────────────────────────────────
-- All of these take p_user_id as a plain argument and move coins. The Next.js
-- server calls them with the SERVICE ROLE key, so anon/authenticated must NOT
-- be able to call them directly from the browser with someone else's id.

REVOKE EXECUTE ON FUNCTION public.join_ludo_queue(uuid, integer)                                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_ludo_queue(uuid, uuid)                                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid)                                     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_ludo_room(uuid)                                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advance_ludo_turn(uuid, text, timestamptz, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.append_ludo_reaction(uuid, jsonb, integer)                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_ludo_match(uuid, text, text, text, integer)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_ludo_stats(uuid, integer, integer, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.join_ludo_queue(uuid, integer)                                   TO service_role;
GRANT  EXECUTE ON FUNCTION public.cancel_ludo_queue(uuid, uuid)                                    TO service_role;
GRANT  EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid)                                     TO service_role;
GRANT  EXECUTE ON FUNCTION public.activate_ludo_room(uuid)                                         TO service_role;
GRANT  EXECUTE ON FUNCTION public.advance_ludo_turn(uuid, text, timestamptz, text, integer, integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.append_ludo_reaction(uuid, jsonb, integer)                        TO service_role;
GRANT  EXECUTE ON FUNCTION public.settle_ludo_match(uuid, text, text, text, integer)               TO service_role;
GRANT  EXECUTE ON FUNCTION public.update_ludo_stats(uuid, integer, integer, integer, integer, integer, integer) TO service_role;

-- The pre-existing functions from 01 were created without a pinned search_path.
ALTER FUNCTION public.cancel_ludo_queue(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_ludo_stats(uuid, integer, integer, integer, integer, integer, integer) SET search_path = public;
ALTER FUNCTION public.handle_new_user_ludo_stats() SET search_path = public;


-- ────────────────────────────────────────────────────────────────────────────
-- 11. Helpful indexes for the hot paths
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ludo_rooms_live_turn
    ON public.ludo_rooms (status, turn_start_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ludo_rooms_live_players
    ON public.ludo_rooms (player_1_id, player_2_id)
    WHERE status IN ('countdown', 'active');

COMMIT;

-- ============================================================================
-- Done. Now run 03_ludo_cron.sql, then (optionally) 99_verify.sql.
-- ============================================================================
