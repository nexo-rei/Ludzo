-- ═══════════════════════════════════════════════════════════════════════════
-- LUDZO — 07: ARENA PLAYERS + 20–28s MATCHMAKING  (Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
-- Kab chalao: 02 → 03 → 04 → 05 → 06 ke BAAD, ek baar. Poori file idempotent hai
-- (BEGIN … COMMIT me wrapped) — dobara chalao to bhi kuch tootega nahi.
--
-- Ye file teen kaam karti hai:
--
--   1. DISPLAY PROFILES HATA DO
--      Admin → Display Profiles feature band. Uski table (aur uske saare fake
--      rows) DROP ho jaati hai. Wahi kaam wala admin page + API bhi repo se
--      delete kar diye gaye hain, leaderboard se bhi uski merge nikal gayi hai.
--
--   2. PURANE BOTS DELETE + 20 REAL-NAAM ARENA PLAYERS
--      Purane "Bot Arjun / Bot Riya / Bot Vikram / Bot Meera / Bot Kabir" rows
--      delete ho jaate hain. Unki jagah 20 asli naam (5 ladkiyan + 15 ladke)
--      seed hote hain — match me, match history me aur room header me THESE
--      names dikhte hain, "Bot …" kuch bhi nahi.
--
--   3. MATCHMAKING FIX — bot 20 se 28 second ke beech RANDOM aata hai
--      Pehle: agar saare bot profiles inactive ho gaye (asli wajah: pichli
--      `07_display_profiles.sql` ne `UPDATE ludo_bot_profiles SET active=false`
--      kar diya tha) to match_ludo_queue ko koi active bot milta hi nahi tha →
--      radar ghoomta rehta tha, "bot ke saath match nahi lag raha" error.
--      Ab:
--        • har queue entry pe ek random `bot_after_secs` (20…28) set hota hai,
--          to bot 20–28 second ke beech kisi bhi moment pe seat le leta hai
--          (turant nahi, aur 20 se pehle bhi nahi);
--        • agar koi real opponent same stake pe wait kar raha ho to bot se
--          PEHLE wahi milta hai (order wahi rehta hai);
--        • agar roster me koi active profile na ho to RPC khud heal karta hai
--          (sab profiles re-activate) aur roster bilkul khaali ho to ek arena
--          player insert kar deta hai → matchmaking kabhi dead-end nahi hoti;
--        • agar user ka koi live room already hai to unique-index 500 ke bajaye
--          wahi room wapas milta hai.
--
-- Requires: 01 (tables), 02 (fixes) — warna pehle wahi chalao.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Sanity — ludo tables hone chahiye
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF to_regclass('public.ludo_queues') IS NULL
       OR to_regclass('public.ludo_rooms') IS NULL
       OR to_regclass('public.ludo_bot_profiles') IS NULL THEN
        RAISE EXCEPTION 'Ludo tables missing — pehle sql/01_ludo_schema.sql aur sql/02_ludo_fixes.sql chalao';
    END IF;
    IF to_regclass('public.users') IS NULL OR to_regclass('public.wallets') IS NULL THEN
        RAISE EXCEPTION 'public.users / public.wallets missing — base app schema hona chahiye';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- 1. DISPLAY PROFILES — feature removed (table + data gone)
-- ────────────────────────────────────────────────────────────────────────────
-- Admin me jo bhi display profiles add kiye the, wo sirf leaderboard pe ek extra
-- row daalte the — na koi real account, na koi playable opponent. Match me
-- "real user" dikhane ke liye SAHI jagah neeche wala arena roster hai.
DROP TABLE IF EXISTS public.ludo_display_profiles;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Per-queue bot window (20…28 s)
-- ────────────────────────────────────────────────────────────────────────────
-- join_ludo_queue() isme ek random value likhta hai; match_ludo_queue() usi ko
-- read karta hai. Column na ho to bhi RPC chalta rahega (wo NULL ko random
-- treat karta hai) — isliye ye ALTER safe hai.
ALTER TABLE public.ludo_queues
    ADD COLUMN IF NOT EXISTS bot_after_secs integer;

COMMENT ON COLUMN public.ludo_queues.bot_after_secs IS
    'Random 20…28 s window after which a house (arena) opponent takes the seat. NULL = pick a fresh random window on every poll.';

-- Purani (ya out-of-range) waiting rows ke liye window set karo.
UPDATE public.ludo_queues
SET    bot_after_secs = 20 + floor(random() * 9)::integer
WHERE  status = 'waiting'
  AND  (bot_after_secs IS NULL OR bot_after_secs NOT BETWEEN 20 AND 28);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Arena roster — purane bots delete, 20 real naam seed
-- ────────────────────────────────────────────────────────────────────────────
-- NOTE: inka `id` deliberately name se derive hota hai (md5 → uuid), isliye
-- file dobara chalane pe uuids badalte nahi — purane live rooms ke
-- 'bot_<uuid>' ids valid rehte hain.
DELETE FROM public.ludo_bot_profiles
WHERE  bot_name NOT IN (
    -- 5 ladkiyan
    'Riya Sharma', 'Ananya Verma', 'Priya Nair', 'Sneha Patel', 'Kavya Iyer',
    -- 15 ladke
    'Aarav Mehta', 'Rohit Kumar', 'Vikram Singh', 'Arjun Reddy', 'Karan Malhotra',
    'Sahil Khan', 'Aditya Rao', 'Manish Gupta', 'Rahul Yadav', 'Nikhil Joshi',
    'Ishaan Bose', 'Devansh Chauhan', 'Suresh Menon', 'Harsh Vardhan', 'Yash Thakur'
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_bot_profiles_name
    ON public.ludo_bot_profiles (bot_name);

INSERT INTO public.ludo_bot_profiles (id, bot_name, avatar, skill_level, active) VALUES
    -- ── 5 ladkiyan ──────────────────────────────────────────────────────────
    ((md5('ludzo-arena-riya-sharma'))::uuid,    'Riya Sharma',    'https://api.dicebear.com/7.x/adventurer/svg?seed=RiyaSharma',    'medium', true),
    ((md5('ludzo-arena-ananya-verma'))::uuid,   'Ananya Verma',   'https://api.dicebear.com/7.x/adventurer/svg?seed=AnanyaVerma',   'easy',   true),
    ((md5('ludzo-arena-priya-nair'))::uuid,     'Priya Nair',     'https://api.dicebear.com/7.x/adventurer/svg?seed=PriyaNair',     'hard',   true),
    ((md5('ludzo-arena-sneha-patel'))::uuid,    'Sneha Patel',    'https://api.dicebear.com/7.x/adventurer/svg?seed=SnehaPatel',    'medium', true),
    ((md5('ludzo-arena-kavya-iyer'))::uuid,     'Kavya Iyer',     'https://api.dicebear.com/7.x/adventurer/svg?seed=KavyaIyer',     'medium', true),
    -- ── 15 ladke ────────────────────────────────────────────────────────────
    ((md5('ludzo-arena-aarav-mehta'))::uuid,    'Aarav Mehta',    'https://api.dicebear.com/7.x/adventurer/svg?seed=AaravMehta',    'medium', true),
    ((md5('ludzo-arena-rohit-kumar'))::uuid,    'Rohit Kumar',    'https://api.dicebear.com/7.x/adventurer/svg?seed=RohitKumar',    'hard',   true),
    ((md5('ludzo-arena-vikram-singh'))::uuid,   'Vikram Singh',   'https://api.dicebear.com/7.x/adventurer/svg?seed=VikramSingh',   'hard',   true),
    ((md5('ludzo-arena-arjun-reddy'))::uuid,    'Arjun Reddy',    'https://api.dicebear.com/7.x/adventurer/svg?seed=ArjunReddy',    'medium', true),
    ((md5('ludzo-arena-karan-malhotra'))::uuid, 'Karan Malhotra', 'https://api.dicebear.com/7.x/adventurer/svg?seed=KaranMalhotra', 'medium', true),
    ((md5('ludzo-arena-sahil-khan'))::uuid,     'Sahil Khan',     'https://api.dicebear.com/7.x/adventurer/svg?seed=SahilKhan',     'easy',   true),
    ((md5('ludzo-arena-aditya-rao'))::uuid,     'Aditya Rao',     'https://api.dicebear.com/7.x/adventurer/svg?seed=AdityaRao',     'medium', true),
    ((md5('ludzo-arena-manish-gupta'))::uuid,   'Manish Gupta',   'https://api.dicebear.com/7.x/adventurer/svg?seed=ManishGupta',   'easy',   true),
    ((md5('ludzo-arena-rahul-yadav'))::uuid,    'Rahul Yadav',    'https://api.dicebear.com/7.x/adventurer/svg?seed=RahulYadav',    'medium', true),
    ((md5('ludzo-arena-nikhil-joshi'))::uuid,   'Nikhil Joshi',   'https://api.dicebear.com/7.x/adventurer/svg?seed=NikhilJoshi',   'hard',   true),
    ((md5('ludzo-arena-ishaan-bose'))::uuid,    'Ishaan Bose',    'https://api.dicebear.com/7.x/adventurer/svg?seed=IshaanBose',    'easy',   true),
    ((md5('ludzo-arena-devansh-chauhan'))::uuid,'Devansh Chauhan', 'https://api.dicebear.com/7.x/adventurer/svg?seed=DevanshChauhan','medium', true),
    ((md5('ludzo-arena-suresh-menon'))::uuid,   'Suresh Menon',   'https://api.dicebear.com/7.x/adventurer/svg?seed=SureshMenon',   'medium', true),
    ((md5('ludzo-arena-harsh-vardhan'))::uuid,  'Harsh Vardhan',  'https://api.dicebear.com/7.x/adventurer/svg?seed=HarshVardhan',  'hard',   true),
    ((md5('ludzo-arena-yash-thakur'))::uuid,    'Yash Thakur',    'https://api.dicebear.com/7.x/adventurer/svg?seed=YashThakur',    'medium', true)
ON CONFLICT (bot_name) DO UPDATE
    SET avatar      = EXCLUDED.avatar,
        skill_level = EXCLUDED.skill_level,
        active      = true;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC: join_ludo_queue — ab har entry ka apna random bot window
-- ────────────────────────────────────────────────────────────────────────────
-- Signature wahi (uuid, integer) — sirf INSERT me bot_after_secs add hua hai.
-- Saare purane guards intact hain: invalid stake reject, live room reject,
-- wallet lock + escrow, double-tap pe unique index ka clean error.

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
    -- bot_after_secs: is entry ke liye random 20…28 second ka window.
    INSERT INTO public.ludo_queues (user_id, stake, status, joined_at, bot_after_secs)
    VALUES (p_user_id, p_stake, 'waiting', now(), 20 + floor(random() * 9)::integer)
    RETURNING id INTO v_queue_id;

    RETURN v_queue_id;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'User is already waiting in a queue';
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPC: match_ludo_queue — real opponent pehle, warna 20–28 s baad arena player
-- ────────────────────────────────────────────────────────────────────────────
-- Returns jsonb:
--   { matched: true,  room_id, opponent_id, match_type: 'human' | 'bot' }
--   { matched: false, waiting_secs, search_secs }        → radar continue
--   { matched: false, cancelled: true }                  → entry cancel ho gayi

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
    MIN_BOT_WAIT_SECS CONSTANT integer := 20;   -- is se pehle bot kabhi nahi
    MAX_BOT_WAIT_SECS CONSTANT integer := 28;   -- is ke baad bot guaranteed

    v_me        public.ludo_queues%ROWTYPE;
    v_opp       public.ludo_queues%ROWTYPE;
    v_live      uuid;
    v_room_id   uuid;
    v_bot       public.ludo_bot_profiles%ROWTYPE;
    v_bot_id    text;
    v_waited    integer;
    v_bot_after integer;
    v_board     jsonb;
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

    -- 1b. Safety net: is user ka koi live room already hai (stuck lobby, second
    --     device, timeout ke baad wapas aaya client)? Unique index ki wajah se
    --     naya room banane pe pehle 500 "Matchmaking error" aata tha — ab wahi
    --     room return hota hai.
    SELECT r.id INTO v_live
    FROM   public.ludo_rooms r
    WHERE  r.status IN ('countdown', 'active')
      AND  (r.player_1_id = p_user_id OR r.player_2_id = p_user_id::text)
    ORDER  BY r.created_at DESC
    LIMIT  1;

    IF v_live IS NOT NULL THEN
        UPDATE public.ludo_queues
        SET    status = 'matched', room_id = v_live, updated_at = now()
        WHERE  id = p_queue_id;

        RETURN jsonb_build_object(
            'matched',     true,
            'room_id',     v_live,
            'match_type',  CASE WHEN EXISTS (
                               SELECT 1 FROM public.ludo_rooms r2
                               WHERE r2.id = v_live AND r2.player_2_id LIKE 'bot_%'
                           ) THEN 'bot' ELSE 'human' END
        );
    END IF;

    -- Empty board for a fresh room (2 tokens per player).
    -- Positions: 0 = yard, 1..51 track, 52..56 lane, 57 home.
    v_board := jsonb_build_object(
        'pieces', jsonb_build_object(
            'player_1', '[0,0]'::jsonb,
            'player_2', '[0,0]'::jsonb
        )
    );

    -- 2. Real opponent first — oldest waiting entry on the same stake.
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

    -- 3. Arena (house-seated) opponent — sirf apne random window ke baad.
    v_waited := GREATEST(0, floor(extract(epoch from (now() - v_me.joined_at)))::integer);

    -- to_jsonb() use kiya hai taki ye RPC un DBs pe bhi chale jahan
    -- bot_after_secs column abhi add nahi hua (NULL → har poll pe fresh random
    -- window, average arrival phir bhi 20–28 s ke beech).
    v_bot_after := COALESCE(NULLIF(to_jsonb(v_me) ->> 'bot_after_secs', '')::integer, 0);
    IF v_bot_after < MIN_BOT_WAIT_SECS OR v_bot_after > 120 THEN
        v_bot_after := MIN_BOT_WAIT_SECS
                     + floor(random() * (MAX_BOT_WAIT_SECS - MIN_BOT_WAIT_SECS + 1))::integer;
    END IF;

    IF v_waited < v_bot_after THEN
        RETURN jsonb_build_object(
            'matched',      false,
            'waiting_secs', v_waited,
            'search_secs',  v_bot_after
        );
    END IF;

    -- Roster se random player. Purane data me sab profiles inactive mil sakte
    -- hain (pichli 07_display_profiles.sql ne active=false kar diya tha) —
    -- us case me RPC khud heal karta hai, warna matchmaking dead-end ho jaati.
    SELECT * INTO v_bot
    FROM   public.ludo_bot_profiles
    ORDER  BY (active = true) DESC, random()
    LIMIT  1;

    IF FOUND AND v_bot.active IS NOT TRUE THEN
        UPDATE public.ludo_bot_profiles SET active = true WHERE id = v_bot.id;
        v_bot.active := true;
    END IF;

    IF NOT FOUND THEN
        -- Roster bilkul khaali — ek arena player bana do, warna user hamesha wait karega.
        INSERT INTO public.ludo_bot_profiles (id, bot_name, avatar, skill_level, active)
        SELECT (md5('ludzo-arena-fallback'))::uuid,
               'Aman Gupta',
               'https://api.dicebear.com/7.x/adventurer/svg?seed=AmanGupta',
               'medium',
               true
        WHERE  NOT EXISTS (SELECT 1 FROM public.ludo_bot_profiles);

        SELECT * INTO v_bot
        FROM   public.ludo_bot_profiles
        ORDER  BY random()
        LIMIT  1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('matched', false, 'waiting_secs', v_waited, 'reason', 'no arena player available');
    END IF;

    -- Arena player ids are 'bot_<uuid>' — har route isi prefix pe kaam karta hai
    -- (turn simulation, settlement, janitor sab).
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
-- 6. Privileges + search_path (02/04 jaisa hi)
-- ────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.join_ludo_queue(uuid, integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid)    FROM PUBLIC, anon, authenticated;

GRANT  EXECUTE ON FUNCTION public.join_ludo_queue(uuid, integer)  TO service_role;
GRANT  EXECUTE ON FUNCTION public.match_ludo_queue(uuid, uuid)    TO service_role;

ALTER FUNCTION public.join_ludo_queue(uuid, integer) SET search_path = public;
ALTER FUNCTION public.match_ludo_queue(uuid, uuid)   SET search_path = public;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. Purane stuck rows ek baar saaf (queue refund + stale room settle)
-- ────────────────────────────────────────────────────────────────────────────
SELECT public.ludo_janitor() AS janitor_result;


COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Run ke baad ye chalake confirm kar lo (read-only):
-- ═══════════════════════════════════════════════════════════════════════════
-- Arena roster — exactly 20 rows, sab active, koi 'Bot %' naam nahi:
--   SELECT count(*) FILTER (WHERE active) AS active_players,
--          count(*)                       AS total_players,
--          count(*) FILTER (WHERE bot_name LIKE 'Bot %') AS old_bots
--   FROM   public.ludo_bot_profiles;
--
-- Display profiles table gayi ya nahi (NULL = gaya):
--   SELECT to_regclass('public.ludo_display_profiles') AS display_profiles_table;
--
-- Matchmaking window column:
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='ludo_queues' AND column_name='bot_after_secs';
--
-- (Optional) Purane accounts dekhne ho to — DELETE karne se pehle soch lo, kyunki
-- public.users se delete karne pe wallet/history bhi CASCADE me chali jaati hai:
--   SELECT id, telegram_id, first_name, created_at FROM public.users ORDER BY created_at;
