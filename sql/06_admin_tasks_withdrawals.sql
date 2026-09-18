-- ============================================================================
-- 06 — ADMIN TASK DELETE  +  WITHDRAWAL APPROVE/REJECT  +  WALLET RPCs
-- ============================================================================
-- KYA KARTA HAI:
--   1. tasks hard-delete ke liye user_tasks FK ko ON DELETE CASCADE
--   2. withdrawals table me reviewed_at / reviewed_by / admin_note / paid_at
--      + status CHECK me pending/approved/rejected/paid allow
--   3. credit_usdt / debit_usdt / credit_coins fallback RPCs (p_reason ke saath)
--
-- Order: 05 ke baad chalao. Idempotent hai — dobara run safe.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. TASK HARD-DELETE
--    Admin "delete" pe task list se gayab hona chahiye. user_tasks history
--    task ke saath cascade ho, warna FK delete rok deta hai.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

DO $$
BEGIN
  IF to_regclass('public.user_tasks') IS NULL OR to_regclass('public.tasks') IS NULL THEN
    RAISE NOTICE 'user_tasks/tasks missing — skip FK';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_tasks_task_id_fkey') THEN
    ALTER TABLE public.user_tasks DROP CONSTRAINT user_tasks_task_id_fkey;
  END IF;

  BEGIN
    ALTER TABLE public.user_tasks
      ADD CONSTRAINT user_tasks_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN RAISE NOTICE 'user_tasks_task_id_fkey skip: %', SQLERRM;
  END;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. WITHDRAWALS — columns + status values jo admin panel expect karta hai
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.withdrawals') IS NULL THEN
    RAISE NOTICE 'withdrawals table missing — skip';
    RETURN;
  END IF;

  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee_amount      numeric NOT NULL DEFAULT 0;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS net_amount      numeric;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS wallet_address  text;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS status          text DEFAULT 'pending';
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS admin_note      text;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reviewed_at     timestamptz;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS reviewed_by     uuid;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS paid_at         timestamptz;
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now();
  ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.withdrawals'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  UPDATE public.withdrawals SET status = 'pending'  WHERE status IS NULL OR btrim(status) = '';
  UPDATE public.withdrawals SET status = 'paid'     WHERE lower(status) IN ('completed', 'complete', 'success', 'sent');
  UPDATE public.withdrawals SET status = 'rejected' WHERE lower(status) IN ('failed', 'fail', 'declined', 'denied');
  UPDATE public.withdrawals SET status = 'approved' WHERE lower(status) IN ('processing', 'review', 'accepted');

  ALTER TABLE public.withdrawals
    ADD CONSTRAINT withdrawals_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'processing', 'failed', 'cancelled'));

  CREATE INDEX IF NOT EXISTS withdrawals_status_idx
    ON public.withdrawals (status, created_at DESC);
END $$;

DO $$
BEGIN
  IF to_regclass('public.deposits') IS NULL THEN RETURN; END IF;
  ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS reviewed_by  uuid;
  ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS completed_at timestamptz;
  ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. WALLET RPCs — admin reject refund / deposit credit yahi call karta hai
--    Purane DBs me p_reason argument nahi hota tha → PATCH 500 de deta tha.
-- ════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.credit_usdt(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.credit_usdt(uuid, numeric);
DROP FUNCTION IF EXISTS public.debit_usdt(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.debit_usdt(uuid, numeric);
DROP FUNCTION IF EXISTS public.credit_coins(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.credit_coins(uuid, integer, text);
DROP FUNCTION IF EXISTS public.credit_coins(uuid, numeric);

CREATE OR REPLACE FUNCTION public.credit_usdt(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'credit')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'invalid credit_usdt args';
  END IF;

  UPDATE public.wallets
     SET usdt_balance = COALESCE(usdt_balance, 0) + p_amount,
         updated_at   = now()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, coin_balance, usdt_balance)
    VALUES (p_user_id, 0, p_amount);
  END IF;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      p_user_id,
      COALESCE(NULLIF(p_reason, ''), 'credit'),
      'usdt',
      p_amount,
      'completed',
      format('%s USDT — %s', p_amount, replace(COALESCE(p_reason, 'credit'), '_', ' '))
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_usdt(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'debit')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bal numeric;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid debit_usdt args';
  END IF;

  SELECT usdt_balance INTO v_bal FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_bal IS NULL OR v_bal < p_amount THEN
    RAISE EXCEPTION 'insufficient USDT balance';
  END IF;

  UPDATE public.wallets
     SET usdt_balance = usdt_balance - p_amount, updated_at = now()
   WHERE user_id = p_user_id;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      p_user_id,
      COALESCE(NULLIF(p_reason, ''), 'debit'),
      'usdt',
      -p_amount,
      'completed',
      format('%s USDT — %s', p_amount, replace(COALESCE(p_reason, 'debit'), '_', ' '))
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_coins(p_user_id uuid, p_amount numeric, p_reason text DEFAULT 'credit')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'invalid credit_coins args';
  END IF;

  UPDATE public.wallets
     SET coin_balance = COALESCE(coin_balance, 0) + p_amount,
         updated_at   = now()
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id, coin_balance, usdt_balance)
    VALUES (p_user_id, p_amount, 0);
  END IF;

  BEGIN
    INSERT INTO public.transactions (user_id, type, currency, amount, status, description)
    VALUES (
      p_user_id,
      COALESCE(NULLIF(p_reason, ''), 'credit'),
      'coins',
      p_amount,
      'completed',
      format('%s Coins — %s', p_amount, replace(COALESCE(p_reason, 'credit'), '_', ' '))
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN true;
END;
$$;

-- integer overloads — JS whole numbers PostgREST aksar int4 bhejta hai
CREATE OR REPLACE FUNCTION public.credit_usdt(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'credit')
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.credit_usdt(p_user_id, p_amount::numeric, p_reason) $$;

CREATE OR REPLACE FUNCTION public.debit_usdt(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'debit')
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.debit_usdt(p_user_id, p_amount::numeric, p_reason) $$;

CREATE OR REPLACE FUNCTION public.credit_coins(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'credit')
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT public.credit_coins(p_user_id, p_amount::numeric, p_reason) $$;

REVOKE ALL ON FUNCTION public.credit_usdt(uuid, numeric, text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_usdt(uuid, numeric, text)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_coins(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_usdt(uuid, integer, text)  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_usdt(uuid, integer, text)   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_coins(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_usdt(uuid, numeric, text)  TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_usdt(uuid, numeric, text)   TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_coins(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_usdt(uuid, integer, text)  TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_usdt(uuid, integer, text)   TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_coins(uuid, integer, text) TO service_role;

COMMIT;

-- ============================================================================
-- DONE. Verify:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.withdrawals'::regclass;
--   select proname from pg_proc where proname in ('credit_usdt','debit_usdt','credit_coins');
-- ============================================================================
