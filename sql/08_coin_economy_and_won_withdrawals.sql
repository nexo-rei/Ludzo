-- ============================================================================
-- 08 — TWO-LEDGER COIN ECONOMY + LUDO WON-COIN WITHDRAWALS
-- ============================================================================
-- Product rules:
--   • 100 Coins = $0.50 (therefore 200 Coins = $1.00).
--   • coin_balance is the PLAYABLE ledger. Deposits, ads, tasks, streaks,
--     referrals and admin adjustments stay here.
--   • won_coins_balance is a locked Ludo-prize ledger. It cannot be staked in
--     a match and it is the only balance eligible for conversion/withdrawal.
--   • conversion requires 1,000 Won Coins ($5.00) and then uses 200 Coins/$1.
--
-- Run after sql/07_arena_players.sql. It is safe to run more than once.
-- ============================================================================

BEGIN;

-- ── 1. Make the two wallet ledgers explicit ─────────────────────────────────
ALTER TABLE IF EXISTS public.wallets
  ADD COLUMN IF NOT EXISTS won_coins_balance integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.wallets') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'wallets_won_coins_balance_nonnegative'
         AND conrelid = 'public.wallets'::regclass
     ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_won_coins_balance_nonnegative
      CHECK (won_coins_balance >= 0);
  END IF;
END $$;

COMMENT ON COLUMN public.wallets.coin_balance IS
  'Playable Coins from deposits, ads, tasks, streaks, referrals and admin credits. Never withdrawable.';
COMMENT ON COLUMN public.wallets.won_coins_balance IS
  'Locked Ludo prize Coins. Not playable; only this ledger can be converted to USDT.';

-- A withdrawal stores the source amount in Won Coins. `amount` remains the
-- gross USDT amount for compatibility with the existing admin/reporting UI.
ALTER TABLE IF EXISTS public.withdrawals
  ADD COLUMN IF NOT EXISTS coin_amount integer,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS network text;

CREATE INDEX IF NOT EXISTS withdrawals_source_idx
  ON public.withdrawals (source, created_at DESC);

COMMENT ON COLUMN public.withdrawals.coin_amount IS
  'Won Coins debited from wallets.won_coins_balance for a Ludo-prize conversion.';
COMMENT ON COLUMN public.withdrawals.source IS
  'ludo_won for new eligible conversions; legacy for pre-economy records.';
COMMENT ON COLUMN public.withdrawals.network IS
  'Payout network selected by the user (TRC20 or BEP20). NULL on legacy records.';

-- ── 2. Persist the fixed public conversion rate ─────────────────────────────
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.settings WHERE key = 'coin_rate') THEN
      UPDATE public.settings SET value = '200' WHERE key = 'coin_rate';
    ELSE
      INSERT INTO public.settings (key, value) VALUES ('coin_rate', '200');
    END IF;
  END IF;
END $$;

-- ── 3. Deposit credit stays in the playable ledger ─────────────────────────
-- This replaces the ambiguous legacy deposit helper for the webhook path. A
-- deposit can increase coin_balance, but it can never increase won_coins_balance.
CREATE OR REPLACE FUNCTION public.credit_playable_coins_for_deposit(
  p_deposit_id  uuid,
  p_user_id     uuid,
  p_coin_amount integer,
  p_payment_id  text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credited_at timestamptz;
BEGIN
  SELECT credited_at INTO v_credited_at
  FROM public.deposits
  WHERE id = p_deposit_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deposit not found';
  END IF;
  IF v_credited_at IS NOT NULL THEN
    RETURN false;
  END IF;
  IF p_coin_amount IS NULL OR p_coin_amount < 1 THEN
    RAISE EXCEPTION 'invalid playable coin amount';
  END IF;

  UPDATE public.wallets
     SET coin_balance = COALESCE(coin_balance, 0) + p_coin_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, coin_balance, usdt_balance, won_coins_balance)
    VALUES (p_user_id, p_coin_amount, 0, 0);
  END IF;

  UPDATE public.deposits
     SET credited_at = now(),
         status = 'completed',
         payment_id = COALESCE(payment_id, p_payment_id)
   WHERE id = p_deposit_id;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, reference_id, description)
    VALUES (
      p_user_id, 'deposit', 'coins', p_coin_amount, 'completed', p_deposit_id::text,
      format('+%s playable Coins from deposit', p_coin_amount)
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

-- ── 4. Referral rewards stay playable ───────────────────────────────────────
-- Referral rows predate the two-ledger economy and called their reward an
-- amount. Keep that column for compatibility, but add an explicit Coin-unit
-- column so a referral can never be mistaken for a withdrawable USDT credit.
ALTER TABLE IF EXISTS public.referrals
  ADD COLUMN IF NOT EXISTS commission_coins integer;

DO $$
BEGIN
  IF to_regclass('public.referrals') IS NOT NULL THEN
    COMMENT ON COLUMN public.referrals.commission_coins IS
      'Playable referral reward in Coins; never credited to won_coins_balance or withdrawable.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.settle_referral_playable_coins(
  p_referee_id         uuid,
  p_deposit_coin_amount integer,
  p_commission_pct     numeric DEFAULT 10
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id  uuid;
  v_referrer_id  uuid;
  v_reward       integer;
BEGIN
  IF p_referee_id IS NULL OR p_deposit_coin_amount IS NULL OR p_deposit_coin_amount < 1 THEN
    RETURN 0;
  END IF;
  IF p_commission_pct IS NULL OR p_commission_pct < 0 OR p_commission_pct >= 100 THEN
    RAISE EXCEPTION 'Invalid referral commission';
  END IF;

  -- The row lock makes retries/racing payment webhooks harmless.
  SELECT id, referrer_id
    INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE referee_id = p_referee_id
    AND COALESCE(first_deposit_processed, false) = false
    AND commission_status = 'pending'
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_reward := floor(p_deposit_coin_amount * (p_commission_pct / 100))::integer;

  UPDATE public.referrals
     SET commission_amount = v_reward,
         commission_coins = v_reward,
         commission_status = 'earned',
         first_deposit_processed = true
   WHERE id = v_referral_id;

  IF v_reward <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.wallets
     SET coin_balance = COALESCE(coin_balance, 0) + v_reward,
         updated_at = now()
   WHERE user_id = v_referrer_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, coin_balance, usdt_balance, won_coins_balance)
    VALUES (v_referrer_id, v_reward, 0, 0);
  END IF;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      v_referrer_id, 'referral_bonus', 'coins', v_reward, 'completed',
      format('+%s playable Coins from referral', v_reward)
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN v_reward;
END;
$$;

-- ── 5. Locked Won-Coin credits/refunds ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_won_coins(
  p_user_id uuid,
  p_amount  numeric,
  p_reason  text DEFAULT 'ludo_prize'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid credit_won_coins args';
  END IF;

  UPDATE public.wallets
     SET won_coins_balance = COALESCE(won_coins_balance, 0) + p_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, coin_balance, usdt_balance, won_coins_balance)
    VALUES (p_user_id, 0, 0, p_amount);
  END IF;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      p_user_id,
      COALESCE(NULLIF(p_reason, ''), 'ludo_prize'),
      'coins',
      p_amount,
      'completed',
      format('%s Won Coins — %s', p_amount, replace(COALESCE(p_reason, 'ludo prize'), '_', ' '))
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_won_coins(
  p_user_id uuid,
  p_amount  numeric,
  p_reason  text DEFAULT 'ludo_won_withdrawal'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid debit_won_coins args';
  END IF;

  SELECT won_coins_balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient Won Coins';
  END IF;

  UPDATE public.wallets
     SET won_coins_balance = won_coins_balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      p_user_id,
      COALESCE(NULLIF(p_reason, ''), 'ludo_won_withdrawal'),
      'coins',
      -p_amount,
      'completed',
      format('%s Won Coins — %s', p_amount, replace(COALESCE(p_reason, 'ludo won withdrawal'), '_', ' '))
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

-- ── 6. Atomic conversion request ────────────────────────────────────────────
-- The route passes only the user's Won-Coin amount and address. The database
-- calculates the dollar value and fee, then debits + inserts in one transaction
-- so a failed withdrawal insert can never burn a user's Won Coins.
CREATE OR REPLACE FUNCTION public.create_ludo_won_withdrawal(
  p_user_id        uuid,
  p_coin_amount    integer,
  p_wallet_address text,
  p_fee_pct        numeric DEFAULT 5,
  p_network        text DEFAULT 'TRC20'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance    integer;
  v_amount     numeric(20, 2);
  v_fee        numeric(20, 2);
  v_net        numeric(20, 2);
  v_network    text;
  v_withdrawal uuid;
BEGIN
  IF p_user_id IS NULL
     OR p_coin_amount IS NULL
     OR p_coin_amount < 1000
     OR mod(p_coin_amount, 200) <> 0 THEN
    RAISE EXCEPTION 'Minimum conversion is 1000 Won Coins and amounts must use 200-Coin steps';
  END IF;

  v_network := upper(btrim(COALESCE(p_network, 'TRC20')));
  IF v_network NOT IN ('TRC20', 'BEP20') THEN
    RAISE EXCEPTION 'Unsupported withdrawal network %', v_network;
  END IF;

  -- The address format must match the selected payout network.
  IF p_wallet_address IS NULL
     OR (v_network = 'TRC20' AND btrim(p_wallet_address) !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$')
     OR (v_network = 'BEP20' AND btrim(p_wallet_address) !~ '^0x[a-fA-F0-9]{40}$') THEN
    RAISE EXCEPTION 'Enter a valid % USDT wallet address', v_network;
  END IF;

  IF p_fee_pct IS NULL OR p_fee_pct < 0 OR p_fee_pct >= 100 THEN
    RAISE EXCEPTION 'Invalid withdrawal fee';
  END IF;

  -- 200 Coins = $1.00. Round at the same two decimal places shown in the UI.
  v_amount := round(p_coin_amount::numeric / 200, 2);
  v_fee    := round(v_amount * (p_fee_pct / 100), 2);
  v_net    := round(v_amount - v_fee, 2);

  SELECT won_coins_balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_coin_amount THEN
    RAISE EXCEPTION 'Insufficient Won Coins. Required: %, available: %', p_coin_amount, COALESCE(v_balance, 0);
  END IF;

  UPDATE public.wallets
     SET won_coins_balance = won_coins_balance - p_coin_amount,
         updated_at = now()
   WHERE user_id = p_user_id;

  INSERT INTO public.withdrawals
    (user_id, amount, coin_amount, fee_amount, net_amount, wallet_address, network, status, source, created_at, updated_at)
  VALUES
    (p_user_id, v_amount, p_coin_amount, v_fee, v_net, btrim(p_wallet_address), v_network, 'pending', 'ludo_won', now(), now())
  RETURNING id INTO v_withdrawal;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, reference_id, description)
    VALUES (
      p_user_id,
      'ludo_won_withdrawal',
      'coins',
      -p_coin_amount,
      'completed',
      v_withdrawal::text,
      format('%s Won Coins converted to $%s USDT', p_coin_amount, v_amount)
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN v_withdrawal;
END;
$$;

DROP FUNCTION IF EXISTS public.create_ludo_won_withdrawal(uuid, integer, text, numeric);

REVOKE ALL ON FUNCTION public.credit_playable_coins_for_deposit(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_referral_playable_coins(uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_won_coins(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_won_coins(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_ludo_won_withdrawal(uuid, integer, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_playable_coins_for_deposit(uuid, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_referral_playable_coins(uuid, integer, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_won_coins(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_won_coins(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_ludo_won_withdrawal(uuid, integer, text, numeric, text) TO service_role;

ALTER FUNCTION public.credit_playable_coins_for_deposit(uuid, uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.settle_referral_playable_coins(uuid, integer, numeric) SET search_path = public;
ALTER FUNCTION public.credit_won_coins(uuid, numeric, text) SET search_path = public;
ALTER FUNCTION public.debit_won_coins(uuid, numeric, text) SET search_path = public;
ALTER FUNCTION public.create_ludo_won_withdrawal(uuid, integer, text, numeric, text) SET search_path = public;

COMMIT;

-- Verify after running:
--   select coin_balance, won_coins_balance from wallets where user_id = '...';
--   select coin_amount, amount, source, status from withdrawals order by created_at desc;
--   select 100 / 200.0 as dollars_for_100_coins; -- 0.50
