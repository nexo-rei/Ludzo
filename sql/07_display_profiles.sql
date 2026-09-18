-- Admin-managed display profiles for leaderboard and future matchmaking UI.
-- These are not Telegram accounts and must never be used as authenticated players.
CREATE TABLE IF NOT EXISTS public.ludo_display_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 60),
  avatar_url text NOT NULL CHECK (avatar_url ~ '^https?://'),
  coin_balance bigint NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  usdt_balance numeric(18,6) NOT NULL DEFAULT 0 CHECK (usdt_balance >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ludo_display_profiles_active_coins
  ON public.ludo_display_profiles (active, coin_balance DESC);
ALTER TABLE public.ludo_display_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS display_profiles_public_read ON public.ludo_display_profiles;
CREATE POLICY display_profiles_public_read ON public.ludo_display_profiles FOR SELECT USING (active = true);

-- Existing seeded fake bots are removed. Admin can add deliberate display profiles
-- through the Admin > Display Profiles page instead.
UPDATE public.ludo_bot_profiles SET active = false WHERE active = true;
