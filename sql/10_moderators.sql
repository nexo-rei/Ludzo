-- ============================================================================
-- 10 — MODERATOR ROLE (limited-access staff accounts)
-- ============================================================================
-- KYA KARTA HAI:
--   1. `admin_users` table ko guarantee karta hai (fresh DB pe create,
--      purane DB me sirf missing columns add).
--   2. `role` column add karta hai — 'admin' (full access) ya 'moderator'
--      (limited access). Purane rows default se 'admin' rehte hain.
--   3. `is_active` / `created_by` / `updated_at` columns ensure karta hai
--      taaki moderator ko ek click me disable kar sako.
--
-- MODERATOR KO KYA MILTA HAI (app level pe enforce hota hai):
--   ✅ Support tickets (reply / status change)
--   ✅ Withdrawal requests SIRF dekhna (approve/reject/mark-paid NAHI)
--   ✅ Users list dekhna — Today / All / Active / Suspended filters
--   ❌ Deposits, Tasks, Announcements, Broadcast, Settings, Logs
--   ❌ Wallet adjustments, suspend/unsuspend — kuch bhi money/power wala NAHI
--
-- PASSWORD: login wahi sha256(password) hex hash use karta hai jo
-- /api/admin/auth pehle se use kar raha tha — isliye naye moderator ka
-- password_hash = encode(digest(password, 'sha256'), 'hex').
-- (SQL me manually moderator banana ho to niche DIYA helper use karo.)
--
-- Run after sql/09_min_deposit_three_usd.sql.
-- Idempotent hai — dobara chalao toh bhi kuch tootega nahi.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. admin_users — table guarantee (fresh DB support)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin',
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Purane DB pe missing columns add karo
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS role       text;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS is_active  boolean NOT NULL DEFAULT true;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Purane admins ka role 'admin' set karo (kabhi NULL na rahe)
UPDATE public.admin_users
   SET role = 'admin'
 WHERE role IS NULL OR btrim(role) = '';

ALTER TABLE public.admin_users ALTER COLUMN role SET DEFAULT 'admin';
ALTER TABLE public.admin_users ALTER COLUMN role SET NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Role CHECK — sirf 'admin' ya 'moderator'
--    (purana DB kisi aur value pe atka ho to pehle usse 'admin' bana do)
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.admin_users
   SET role = 'admin'
 WHERE lower(role) NOT IN ('admin', 'moderator');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'admin_users_role_check'
       AND conrelid = 'public.admin_users'::regclass
  ) THEN
    ALTER TABLE public.admin_users DROP CONSTRAINT admin_users_role_check;
  END IF;

  BEGIN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_role_check
      CHECK (lower(role) IN ('admin', 'moderator'));
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN RAISE NOTICE 'admin_users_role_check skip: %', SQLERRM;
  END;
END $$;

CREATE INDEX IF NOT EXISTS admin_users_role_idx
  ON public.admin_users (role);

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION public.touch_admin_users_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS admin_users_touch ON public.admin_users;
CREATE TRIGGER admin_users_touch
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.touch_admin_users_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Helper (optional) — SQL se manually moderator banana ho to:
--
--   INSERT INTO public.admin_users (username, password_hash, role, created_by)
--   VALUES (
--     'mod_rahul',
--     encode(digest('MyStrongPassword123', 'sha256'), 'hex'),  -- pgcrypto
--     'moderator',
--     (SELECT id FROM public.admin_users WHERE username = 'admin')
--   )
--   ON CONFLICT (username) DO NOTHING;
--
--   Normally moderator admin panel se hi banao:
--   /admin/moderators (sirf full admin ko dikhta hai).
-- ════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.admin_users IS
  'Staff logins. role=admin → full panel, role=moderator → tickets + read-only withdrawals/users. Password hash = sha256(password) hex.';

COMMIT;
