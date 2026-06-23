-- ====================================================================
-- LUDZO LUDO 1V1 - COMPLETE DATABASE MIGRATION
-- Target: Supabase PostgreSQL
-- ====================================================================


-- ====================================================================
-- 1. MATCHMAKING QUEUE
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_queues (
    id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stake         integer     NOT NULL CHECK (stake IN (50, 100, 200, 500, 1000, 2000, 5000)),
    status        text        NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'matched', 'cancelled')),
    room_id       uuid,
    joined_at     timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_queues_search
    ON ludo_queues (stake, status, joined_at)
    WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_ludo_queues_user
    ON ludo_queues (user_id)
    WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS idx_ludo_queues_room
    ON ludo_queues (room_id)
    WHERE room_id IS NOT NULL;


-- ====================================================================
-- 2. LUDO GAME ROOMS
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_rooms (
    id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    stake               integer     NOT NULL CHECK (stake IN (50, 100, 200, 500, 1000, 2000, 5000)),
    player_1_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_2_id         text        NOT NULL,   -- UUID text or 'bot_xxx'
    player_1_status     text        NOT NULL DEFAULT 'connected'
                                    CHECK (player_1_status IN ('connected', 'disconnected')),
    player_2_status     text        NOT NULL DEFAULT 'connected'
                                    CHECK (player_2_status IN ('connected', 'disconnected')),
    status              text        NOT NULL DEFAULT 'countdown'
                                    CHECK (status IN ('countdown', 'active', 'completed', 'forfeited')),
    board_state         jsonb       NOT NULL DEFAULT '{}'::jsonb,
    turn_player_id      text        NOT NULL,
    turn_start_at       timestamptz NOT NULL DEFAULT now(),
    dice_rolled         boolean     NOT NULL DEFAULT false,
    last_roll           integer     NOT NULL DEFAULT 0
                                    CHECK (last_roll >= 0 AND last_roll <= 6),
    movable_pieces      integer[]   NOT NULL DEFAULT '{}'::integer[],
    hearts_player_1     integer     NOT NULL DEFAULT 3 CHECK (hearts_player_1 >= 0),
    hearts_player_2     integer     NOT NULL DEFAULT 3 CHECK (hearts_player_2 >= 0),
    score_player_1      integer     NOT NULL DEFAULT 0,
    score_player_2      integer     NOT NULL DEFAULT 0,
    winner_id           text,
    loser_id            text,
    win_reason          text        CHECK (win_reason IN ('normal', 'forfeit', 'timeout', 'score_timer')),
    chat_reactions      jsonb       NOT NULL DEFAULT '[]'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_rooms_status
    ON ludo_rooms (status)
    WHERE status IN ('countdown', 'active');

CREATE INDEX IF NOT EXISTS idx_ludo_rooms_player_1
    ON ludo_rooms (player_1_id);

CREATE INDEX IF NOT EXISTS idx_ludo_rooms_player_2
    ON ludo_rooms (player_2_id);

CREATE INDEX IF NOT EXISTS idx_ludo_rooms_created
    ON ludo_rooms (created_at DESC);


-- ====================================================================
-- 3. MATCH HISTORY
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_match_history (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id         uuid        NOT NULL,
    opponent_name   text        NOT NULL,
    opponent_avatar text,
    stake           integer     NOT NULL CHECK (stake IN (50, 100, 200, 500, 1000, 2000, 5000)),
    result          text        NOT NULL CHECK (result IN ('win', 'loss')),
    duration        integer     NOT NULL CHECK (duration >= 0),
    reward          integer     NOT NULL DEFAULT 0 CHECK (reward >= 0),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_match_history_user
    ON ludo_match_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ludo_match_history_room
    ON ludo_match_history (room_id);


-- ====================================================================
-- 4. PLAYER STATISTICS
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_stats (
    user_id         uuid    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    wins            integer NOT NULL DEFAULT 0 CHECK (wins >= 0),
    losses          integer NOT NULL DEFAULT 0 CHECK (losses >= 0),
    total_matches   integer NOT NULL DEFAULT 0 CHECK (total_matches >= 0),
    win_rate        text    NOT NULL DEFAULT '0%',
    current_streak  integer NOT NULL DEFAULT 0,
    best_streak     integer NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
    total_won_coins integer NOT NULL DEFAULT 0 CHECK (total_won_coins >= 0),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_stats_wins
    ON ludo_stats (wins DESC);

CREATE INDEX IF NOT EXISTS idx_ludo_stats_won_coins
    ON ludo_stats (total_won_coins DESC);


-- ====================================================================
-- 5. BOT PROFILES
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_bot_profiles (
    id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
    bot_name    text    NOT NULL,
    avatar      text,
    skill_level text    NOT NULL DEFAULT 'medium'
                        CHECK (skill_level IN ('easy', 'medium', 'hard')),
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_bots_active
    ON ludo_bot_profiles (active)
    WHERE active = true;

-- Seed default bots
INSERT INTO ludo_bot_profiles (bot_name, avatar, skill_level, active) VALUES
    ('Bot Arjun',  'bot_arjun.png',  'easy',   true),
    ('Bot Riya',   'bot_riya.png',   'medium',  true),
    ('Bot Vikram', 'bot_vikram.png', 'hard',   true)
ON CONFLICT DO NOTHING;


-- ====================================================================
-- 6. ROOM STATE STORAGE (persisted snapshots for reconnect)
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_room_states (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id     uuid        NOT NULL REFERENCES ludo_rooms(id) ON DELETE CASCADE,
    state       jsonb       NOT NULL,
    snapshot_at timestamptz NOT NULL DEFAULT now()
);

-- Only keep latest snapshot per room — old ones cleaned by trigger below
CREATE UNIQUE INDEX IF NOT EXISTS idx_ludo_room_states_room
    ON ludo_room_states (room_id);


-- ====================================================================
-- 7. REACTIONS STORAGE
-- ====================================================================

CREATE TABLE IF NOT EXISTS ludo_reactions (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id     uuid        NOT NULL REFERENCES ludo_rooms(id) ON DELETE CASCADE,
    sender_id   text        NOT NULL,   -- UUID text or 'bot_xxx'
    reaction    text        NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ludo_reactions_room
    ON ludo_reactions (room_id, sent_at DESC);


-- ====================================================================
-- 8. WALLET SETTLEMENT COLUMNS
--    Assumes wallets table exists. Adds won_coins_balance if absent.
-- ====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'wallets'
          AND column_name = 'won_coins_balance'
    ) THEN
        ALTER TABLE wallets
            ADD COLUMN won_coins_balance integer NOT NULL DEFAULT 0
                CHECK (won_coins_balance >= 0);
    END IF;
END;
$$;


-- ====================================================================
-- 9. TRIGGER FUNCTIONS
-- ====================================================================

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_ludo_queues_updated_at
    BEFORE UPDATE ON ludo_queues
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_ludo_rooms_updated_at
    BEFORE UPDATE ON ludo_rooms
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_ludo_stats_updated_at
    BEFORE UPDATE ON ludo_stats
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_ludo_bots_updated_at
    BEFORE UPDATE ON ludo_bot_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create ludo_stats row when a new user is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user_ludo_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.ludo_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Drop and recreate to avoid duplicate trigger error on re-run
DROP TRIGGER IF EXISTS on_user_created_ludo_stats ON public.users;

CREATE TRIGGER on_user_created_ludo_stats
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_ludo_stats();

-- Seed stats for any pre-existing users
INSERT INTO public.ludo_stats (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;


-- ====================================================================
-- 10. RPC: join_ludo_queue
--     Validates stake value, checks balance, deducts coins, enqueues.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.join_ludo_queue(
    p_user_id uuid,
    p_stake   integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance  integer;
    v_queue_id uuid;
    v_already  integer;
BEGIN
    -- Validate stake denomination
    IF p_stake NOT IN (50, 100, 200, 500, 1000, 2000, 5000) THEN
        RAISE EXCEPTION 'Invalid stake value: %. Allowed: 50,100,200,500,1000,2000,5000', p_stake;
    END IF;

    -- Prevent duplicate waiting entry for same user + stake
    SELECT COUNT(*) INTO v_already
    FROM ludo_queues
    WHERE user_id = p_user_id
      AND stake   = p_stake
      AND status  = 'waiting';

    IF v_already > 0 THEN
        RAISE EXCEPTION 'User is already waiting in a % stake queue', p_stake;
    END IF;

    -- Lock wallet row and read balance
    SELECT coin_balance INTO v_balance
    FROM wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
    END IF;

    IF v_balance < p_stake THEN
        RAISE EXCEPTION 'Insufficient coins. Required: %, Available: %', p_stake, v_balance;
    END IF;

    -- Deduct stake from coin_balance
    UPDATE wallets
    SET coin_balance = coin_balance - p_stake,
        updated_at   = now()
    WHERE user_id = p_user_id;

    -- Insert queue entry
    INSERT INTO ludo_queues (user_id, stake, status, joined_at)
    VALUES (p_user_id, p_stake, 'waiting', now())
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
END;
$$;


-- ====================================================================
-- 11. RPC: cancel_ludo_queue
--     Cancels a waiting queue entry and refunds stake.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.cancel_ludo_queue(
    p_queue_id uuid,
    p_user_id  uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stake  integer;
    v_status text;
BEGIN
    -- Lock the queue row
    SELECT stake, status
    INTO   v_stake, v_status
    FROM   ludo_queues
    WHERE  id      = p_queue_id
      AND  user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Queue entry not found or does not belong to user';
    END IF;

    IF v_status != 'waiting' THEN
        RETURN false;   -- already matched or cancelled — no refund
    END IF;

    -- Cancel the entry
    UPDATE ludo_queues
    SET status     = 'cancelled',
        updated_at = now()
    WHERE id = p_queue_id;

    -- Refund stake to coin_balance
    UPDATE wallets
    SET coin_balance = coin_balance + v_stake,
        updated_at   = now()
    WHERE user_id = p_user_id;

    RETURN true;
END;
$$;


-- ====================================================================
-- 12. RPC: settle_ludo_match
--     Finalises a room, awards won_coins_balance to winner,
--     writes match history for both sides, updates statistics.
--     Fee: 2% of total pool deducted from winner reward.
-- ====================================================================

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
AS $$
DECLARE
    v_stake         integer;
    v_winner_uuid   uuid;
    v_loser_uuid    uuid;
    v_reward        integer;
    v_winner_name   text;
    v_winner_avatar text;
    v_loser_name    text;
    v_loser_avatar  text;
    v_new_streak    integer;
BEGIN
    -- Validate win_reason
    IF p_win_reason NOT IN ('normal', 'forfeit', 'timeout', 'score_timer') THEN
        RAISE EXCEPTION 'Invalid win_reason: %', p_win_reason;
    END IF;

    -- Lock room and confirm it has not already been settled
    SELECT stake INTO v_stake
    FROM   ludo_rooms
    WHERE  id     = p_room_id
      AND  status NOT IN ('completed', 'forfeited')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;   -- already settled or room missing
    END IF;

    -- Mark room settled
    UPDATE ludo_rooms
    SET status     = CASE
                         WHEN p_win_reason = 'forfeit' THEN 'forfeited'
                         ELSE 'completed'
                     END,
        winner_id  = p_winner_id,
        loser_id   = p_loser_id,
        win_reason = p_win_reason,
        updated_at = now()
    WHERE id = p_room_id;

    -- Reward = (stake × 2) − 2 % platform fee, floored to integer
    v_reward := floor((v_stake * 2) * 0.98)::integer;

    -- ── Winner ────────────────────────────────────────────────────
    IF p_winner_id NOT LIKE 'bot_%' THEN
        v_winner_uuid := p_winner_id::uuid;

        UPDATE wallets
        SET won_coins_balance = won_coins_balance + v_reward,
            updated_at        = now()
        WHERE user_id = v_winner_uuid;

        SELECT first_name, photo_url
        INTO   v_winner_name, v_winner_avatar
        FROM   users
        WHERE  id = v_winner_uuid;
    ELSE
        v_winner_name   := 'Ludo Bot';
        v_winner_avatar := '';
    END IF;

    -- ── Loser ─────────────────────────────────────────────────────
    IF p_loser_id NOT LIKE 'bot_%' THEN
        v_loser_uuid := p_loser_id::uuid;

        SELECT first_name, photo_url
        INTO   v_loser_name, v_loser_avatar
        FROM   users
        WHERE  id = v_loser_uuid;
    ELSE
        v_loser_name   := 'Ludo Bot';
        v_loser_avatar := '';
    END IF;

    -- ── Winner history + stats ────────────────────────────────────
    IF v_winner_uuid IS NOT NULL THEN
        INSERT INTO ludo_match_history
            (user_id, room_id, opponent_name, opponent_avatar,
             stake, result, duration, reward, created_at)
        VALUES
            (v_winner_uuid, p_room_id, v_loser_name, v_loser_avatar,
             v_stake, 'win', p_duration, v_reward, now());

        -- Calculate new streak before the UPDATE to avoid self-referencing drift
        SELECT current_streak + 1 INTO v_new_streak
        FROM   ludo_stats
        WHERE  user_id = v_winner_uuid;

        UPDATE ludo_stats
        SET wins            = wins + 1,
            total_matches   = total_matches + 1,
            current_streak  = v_new_streak,
            best_streak     = GREATEST(best_streak, v_new_streak),
            total_won_coins = total_won_coins + v_reward,
            win_rate        = round(
                                  ((wins + 1)::numeric / (total_matches + 1)::numeric) * 100
                              )::text || '%',
            updated_at      = now()
        WHERE user_id = v_winner_uuid;
    END IF;

    -- ── Loser history + stats ─────────────────────────────────────
    IF v_loser_uuid IS NOT NULL THEN
        INSERT INTO ludo_match_history
            (user_id, room_id, opponent_name, opponent_avatar,
             stake, result, duration, reward, created_at)
        VALUES
            (v_loser_uuid, p_room_id, v_winner_name, v_winner_avatar,
             v_stake, 'loss', p_duration, 0, now());

        UPDATE ludo_stats
        SET losses         = losses + 1,
            total_matches  = total_matches + 1,
            current_streak = 0,
            win_rate       = CASE
                                 WHEN (total_matches + 1) = 0 THEN '0%'
                                 ELSE round(
                                          (wins::numeric / (total_matches + 1)::numeric) * 100
                                      )::text || '%'
                             END,
            updated_at     = now()
        WHERE user_id = v_loser_uuid;
    END IF;

    RETURN true;
END;
$$;


-- ====================================================================
-- 13. RPC: update_ludo_stats  (manual override / admin correction)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.update_ludo_stats(
    p_user_id       uuid,
    p_wins          integer DEFAULT NULL,
    p_losses        integer DEFAULT NULL,
    p_total_matches integer DEFAULT NULL,
    p_current_streak integer DEFAULT NULL,
    p_best_streak   integer DEFAULT NULL,
    p_total_won_coins integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wins   integer;
    v_total  integer;
BEGIN
    -- Merge supplied values with existing values
    SELECT
        COALESCE(p_wins,   wins),
        COALESCE(p_total_matches, total_matches)
    INTO v_wins, v_total
    FROM ludo_stats
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE ludo_stats
    SET wins            = COALESCE(p_wins,            wins),
        losses          = COALESCE(p_losses,          losses),
        total_matches   = COALESCE(p_total_matches,   total_matches),
        current_streak  = COALESCE(p_current_streak,  current_streak),
        best_streak     = COALESCE(p_best_streak,     best_streak),
        total_won_coins = COALESCE(p_total_won_coins, total_won_coins),
        win_rate        = CASE
                              WHEN v_total = 0 THEN '0%'
                              ELSE round((v_wins::numeric / v_total::numeric) * 100)::text || '%'
                          END,
        updated_at      = now()
    WHERE user_id = p_user_id;

    RETURN true;
END;
$$;


-- ====================================================================
-- 14. ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE ludo_queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_match_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_bot_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_room_states    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ludo_reactions      ENABLE ROW LEVEL SECURITY;

-- ── ludo_queues ───────────────────────────────────────────────────
DROP POLICY IF EXISTS policy_queues_select ON ludo_queues;
CREATE POLICY policy_queues_select ON ludo_queues
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS policy_queues_insert ON ludo_queues;
CREATE POLICY policy_queues_insert ON ludo_queues
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ── ludo_rooms ────────────────────────────────────────────────────
DROP POLICY IF EXISTS policy_rooms_select ON ludo_rooms;
CREATE POLICY policy_rooms_select ON ludo_rooms
    FOR SELECT TO authenticated
    USING (
        player_1_id = auth.uid()
        OR player_2_id = auth.uid()::text
    );

-- ── ludo_match_history ────────────────────────────────────────────
DROP POLICY IF EXISTS policy_history_select ON ludo_match_history;
CREATE POLICY policy_history_select ON ludo_match_history
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ── ludo_stats ────────────────────────────────────────────────────
DROP POLICY IF EXISTS policy_stats_select_own ON ludo_stats;
CREATE POLICY policy_stats_select_own ON ludo_stats
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Public leaderboard read (all authenticated users may read all stats)
DROP POLICY IF EXISTS policy_stats_select_leaderboard ON ludo_stats;
CREATE POLICY policy_stats_select_leaderboard ON ludo_stats
    FOR SELECT TO authenticated
    USING (true);

-- ── ludo_bot_profiles ─────────────────────────────────────────────
DROP POLICY IF EXISTS policy_bots_select ON ludo_bot_profiles;
CREATE POLICY policy_bots_select ON ludo_bot_profiles
    FOR SELECT TO authenticated
    USING (active = true);

-- ── ludo_room_states ──────────────────────────────────────────────
DROP POLICY IF EXISTS policy_room_states_select ON ludo_room_states;
CREATE POLICY policy_room_states_select ON ludo_room_states
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ludo_rooms r
            WHERE r.id = ludo_room_states.room_id
              AND (r.player_1_id = auth.uid()
                   OR r.player_2_id = auth.uid()::text)
        )
    );

-- ── ludo_reactions ────────────────────────────────────────────────
DROP POLICY IF EXISTS policy_reactions_select ON ludo_reactions;
CREATE POLICY policy_reactions_select ON ludo_reactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM ludo_rooms r
            WHERE r.id = ludo_reactions.room_id
              AND (r.player_1_id = auth.uid()
                   OR r.player_2_id = auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS policy_reactions_insert ON ludo_reactions;
CREATE POLICY policy_reactions_insert ON ludo_reactions
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM ludo_rooms r
            WHERE r.id = ludo_reactions.room_id
              AND (r.player_1_id = auth.uid()
                   OR r.player_2_id = auth.uid()::text)
              AND r.status = 'active'
        )
    );


-- ====================================================================
-- END OF MIGRATION
-- ====================================================================
