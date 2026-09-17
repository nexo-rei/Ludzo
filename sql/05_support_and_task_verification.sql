-- ============================================================================
-- 05 — SUPPORT TICKETS  +  TASK JOIN-VERIFICATION  +  ADMIN LOG HARDENING
-- ============================================================================
-- KYA KARTA HAI:
--   1. support_tickets + support_ticket_messages tables banata hai
--      (user ticket bhejta hai -> admin panel me "Support" inbox me dikhta hai)
--   2. tasks table me channel verification ke columns ensure karta hai
--      (target_id = chat id / @username, jisse bot getChatMember se check kare)
--   3. admin_logs table ko dono purane/naye column names ke saath compatible
--      banata hai + trigger lagata hai, taaki /admin/logs page crash na ho
--
-- Order: 01 -> 02 -> 03 -> 04 ke baad chalao. Idempotent hai — dobara run safe.
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. SUPPORT TICKETS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  subject      text NOT NULL,
  message      text NOT NULL,
  category     text NOT NULL DEFAULT 'general',
  priority     text NOT NULL DEFAULT 'normal',
  status       text NOT NULL DEFAULT 'open',   -- open | in_progress | resolved | closed
  admin_reply  text,
  replied_by   uuid,
  replied_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Purani/legacy table ho to missing columns add kar do
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS user_id     uuid;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS subject     text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS message     text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category    text DEFAULT 'general';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority    text DEFAULT 'normal';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS status      text DEFAULT 'open';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS replied_by  uuid;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS replied_at  timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS support_tickets_user_idx    ON public.support_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx  ON public.support_tickets (status, created_at DESC);

-- Reply thread (user message + admin replies ek hi jagah)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL,
  sender_type  text NOT NULL DEFAULT 'user',   -- user | admin | system
  sender_id    uuid,
  sender_name  text,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS ticket_id   uuid;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS sender_type text DEFAULT 'user';
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS sender_id   uuid;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS body        text;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx
  ON public.support_ticket_messages (ticket_id, created_at ASC);

-- Foreign keys — sirf tab jab users / support_tickets table maujood ho
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_tickets_user_id_fkey') THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'support_tickets FK skip: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'support_ticket_messages_ticket_id_fkey') THEN
    ALTER TABLE public.support_ticket_messages
      ADD CONSTRAINT support_ticket_messages_ticket_id_fkey
      FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'support_ticket_messages FK skip: %', SQLERRM;
END $$;

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION public.ludzo_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_touch ON public.support_tickets;
CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.ludzo_touch_updated_at();

-- RLS on, koi public policy nahi -> anon key se tickets padhe nahi ja sakte.
-- Hamare API routes service-role client use karte hain (RLS bypass), isliye kaam karega.
ALTER TABLE public.support_tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages  ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. TASK JOIN-VERIFICATION COLUMNS
--    (bot ko channel/group me admin hona chahiye — tabhi getChatMember chalta hai)
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS target_id    text;
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS target_link  text;
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS sort_order   integer DEFAULT 0;
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS is_active    boolean DEFAULT true;
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS reward_coins integer DEFAULT 0;
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Same chat ko dobara add karne se reward farm na ho — (type, target_id) unique rakho
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS tasks_unique_target_uidx
      ON public.tasks (target_id) WHERE target_id IS NOT NULL AND is_active IS TRUE;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'tasks unique target index skip: %', SQLERRM;
END $$;

ALTER TABLE IF EXISTS public.user_tasks ADD COLUMN IF NOT EXISTS status      text DEFAULT 'in_progress';
ALTER TABLE IF EXISTS public.user_tasks ADD COLUMN IF NOT EXISTS reward_coins integer;
ALTER TABLE IF EXISTS public.user_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE IF EXISTS public.user_tasks ADD COLUMN IF NOT EXISTS updated_at   timestamptz DEFAULT now();

-- Ek user + ek task = ek row (duplicate reward claim block)
DO $$
BEGIN
  IF to_regclass('public.user_tasks') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS user_tasks_user_task_uidx
      ON public.user_tasks (user_id, task_id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'user_tasks unique index skip (duplicates honge): %', SQLERRM;
END $$;

DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS tasks_active_type_idx ON public.tasks (is_active, type, sort_order);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'tasks index skip: %', SQLERRM;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. ADMIN LOGS HARDENING (crash fix)
--    Dono naming conventions support karo: action/action_type + admin_id/admin_user
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid,
  admin_user  text,
  action      text NOT NULL DEFAULT 'unknown',
  action_type text,
  target_type text,
  target_id   text,
  target      text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS admin_id    uuid;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS admin_user  text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS action      text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS target_type text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS target_id   text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS target      text;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS details     jsonb;
ALTER TABLE public.admin_logs ADD COLUMN IF NOT EXISTS created_at  timestamptz DEFAULT now();

-- Purane inserts (jo sirf action_type / admin_user bhejte hain) ko naye columns me mirror karo
CREATE OR REPLACE FUNCTION public.ludzo_sync_admin_log() RETURNS trigger AS $$
BEGIN
  IF NEW.action IS NULL AND NEW.action_type IS NOT NULL THEN NEW.action := NEW.action_type; END IF;
  IF NEW.action_type IS NULL AND NEW.action IS NOT NULL THEN NEW.action_type := NEW.action; END IF;
  IF NEW.action IS NULL AND NEW.action_type IS NULL THEN NEW.action := 'unknown'; END IF;

  IF NEW.admin_user IS NULL AND NEW.admin_id IS NOT NULL
     AND to_regclass('public.admin_users') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT username FROM public.admin_users WHERE id = $1' INTO NEW.admin_user USING NEW.admin_id;
    EXCEPTION WHEN others THEN
      NULL; -- lookup fail ho to insert kabhi na toote
    END;
  END IF;

  IF NEW.target IS NULL AND NEW.target_id IS NOT NULL THEN NEW.target := NEW.target_id; END IF;
  IF NEW.created_at IS NULL THEN NEW.created_at := now(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ludzo_admin_logs_sync ON public.admin_logs;
CREATE TRIGGER ludzo_admin_logs_sync BEFORE INSERT OR UPDATE ON public.admin_logs
FOR EACH ROW EXECUTE FUNCTION public.ludzo_sync_admin_log();

CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON public.admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_logs_action_idx  ON public.admin_logs (action);

COMMIT;

-- ============================================================================
-- DONE. Verify:  select count(*) from support_tickets;
--                select id, action, created_at from admin_logs order by created_at desc limit 5;
-- ============================================================================
