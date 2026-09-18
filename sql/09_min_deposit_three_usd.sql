-- ============================================================================
-- 09 — MINIMUM DEPOSIT = $3.00
-- ============================================================================
-- Sirf minimum deposit badla hai. Coin rate bilkul wahi hai:
--   • 100 Coins = $0.50  (200 Coins = $1.00)   ← UNCHANGED
--   • Minimum deposit ab 600 Coins = $3.00     ← NAYA (pehle 100 Coins = $0.50)
--   • Maximum deposit wahi 50,000 Coins = $250.00
--
-- Ye file:
--   1. settings.min_deposit / min_deposit_usdt ko '3.00' pe pin karti hai
--      (admin panel bhi ab isse read-only dikhata hai),
--   2. coin_rate ko 200 pe dobara confirm karti hai (taaki koi purana row
--      rate ko na hila de),
--   3. enforce_min_deposit() guard + deposits table ka CHECK add karti hai,
--      taaki DB level pe bhi $3 se chhota naya deposit insert na ho sake.
--
-- Run after sql/08_coin_economy_and_won_withdrawals.sql.
-- Idempotent hai — dobara chalao toh bhi kuch tootega nahi.
-- ============================================================================

BEGIN;

-- ── 1. Pin the deposit floor in settings ────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    -- The Coin rate stays exactly where it was.
    IF EXISTS (SELECT 1 FROM public.settings WHERE key = 'coin_rate') THEN
      UPDATE public.settings SET value = '200' WHERE key = 'coin_rate';
    ELSE
      INSERT INTO public.settings (key, value) VALUES ('coin_rate', '200');
    END IF;

    -- Only the floor moves: $3.00.
    IF EXISTS (SELECT 1 FROM public.settings WHERE key = 'min_deposit') THEN
      UPDATE public.settings SET value = '3.00' WHERE key = 'min_deposit';
    ELSE
      INSERT INTO public.settings (key, value) VALUES ('min_deposit', '3.00');
    END IF;

    -- The admin panel historically saved the aliased key as well.
    IF EXISTS (SELECT 1 FROM public.settings WHERE key = 'min_deposit_usdt') THEN
      UPDATE public.settings SET value = '3.00' WHERE key = 'min_deposit_usdt';
    ELSE
      INSERT INTO public.settings (key, value) VALUES ('min_deposit_usdt', '3.00');
    END IF;
  END IF;
END $$;

-- ── 2. Helper: the single source of truth for the floor, in Coins ───────────
CREATE OR REPLACE FUNCTION public.min_deposit_coins()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  -- $3.00 at the fixed public rate of 200 Coins per $1.
  SELECT 600;
$$;

COMMENT ON FUNCTION public.min_deposit_coins() IS
  'Minimum deposit in playable Coins ($3.00 at the fixed 200 Coins = $1 rate).';

-- ── 3. Database-level guard on new deposits ────────────────────────────────
-- Historical rows below the new floor stay valid: the constraint is NOT VALID
-- so it only applies to rows inserted or updated from now on.
DO $$
BEGIN
  IF to_regclass('public.deposits') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = 'deposits'
         AND column_name  = 'coin_amount'
     )
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname   = 'deposits_min_coin_amount'
         AND conrelid  = 'public.deposits'::regclass
     ) THEN
    ALTER TABLE public.deposits
      ADD CONSTRAINT deposits_min_coin_amount
      CHECK (coin_amount IS NULL OR coin_amount >= 600 AND coin_amount <= 50000)
      NOT VALID;
  END IF;
END $$;

COMMENT ON CONSTRAINT deposits_min_coin_amount ON public.deposits IS
  'New deposits must be between 600 Coins ($3.00) and 50,000 Coins ($250.00). Legacy rows are exempt (NOT VALID).';

COMMIT;

-- Verify after running:
--   select key, value from settings where key in ('coin_rate','min_deposit','min_deposit_usdt');
--     → coin_rate = 200, min_deposit = 3.00, min_deposit_usdt = 3.00
--   select public.min_deposit_coins();                    -- 600
--   select 100 / 200.0 as dollars_for_100_coins;          -- 0.50 (rate unchanged)
--   select 600 / 200.0 as dollars_for_min_deposit;        -- 3.00
