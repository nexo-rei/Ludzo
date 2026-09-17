/**
 * LUDZO — Support / task-verification / admin-logs SQL verification
 * ============================================================================
 * sql/05_support_and_task_verification.sql ko REAL PostgreSQL (in-process WASM
 * via PGlite) par apply karta hai — including a *legacy* admin_logs table —
 * aur assert karta hai ki:
 *
 *   • support_tickets + support_ticket_messages bane aur insert/select chale
 *   • tasks me target_id / target_link columns aa gaye
 *   • admin_logs purane (admin_user + action_type + target) aur naye
 *     (admin_id + action + target_id) dono shapes accept karta hai
 *   • trigger purane columns ko naye me mirror karta hai (logs page crash fix)
 *
 *     npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-support-sql.js
 *
 * Exit 0 = sab pass. Exit 1 = pehla failing check print hota hai.
 */
const fs = require("fs");
const path = require("path");

let PGlite;
try {
  ({ PGlite } = require("@electric-sql/pglite"));
} catch {
  console.error("PGlite not found. Run:\n  npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-support-sql.js");
  process.exit(2);
}

const REPO = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(`${REPO}/${p}`, "utf8");

let step = "";
const fail = (m) => { console.error(`\n❌ FAIL @ ${step}: ${m}`); process.exit(1); };
const ok = (m) => console.log(`  ✅ ${m}`);
const expect = (cond, m) => (cond ? ok(m) : fail(m));

// Minimal host schema — jaisa purane Ludzo DB me hota hai.
const BASE = `
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint,
  first_name text,
  username text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'channel_join',
  reward_coins integer NOT NULL DEFAULT 0,
  target_link text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  status text DEFAULT 'in_progress',
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  role text DEFAULT 'admin'
);
-- LEGACY admin_logs shape (purane DBs me yahi tha: admin_user + action_type + target + details text)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user text,
  action_type text,
  target text,
  details text,
  created_at timestamptz DEFAULT now()
);
`;

(async () => {
  const db = new PGlite();
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const exec = async (sql) => db.exec(sql);
  const colExists = async (table, col) =>
    (await q(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, col]
    )).length > 0;

  try {
    step = "base schema";
    await exec(BASE);
    ok("host schema ready (legacy admin_logs included)");

    step = "apply sql/05";
    await exec(read("sql/05_support_and_task_verification.sql"));
    ok("sql/05_support_and_task_verification.sql applied without error");

    step = "re-apply sql/05 (idempotency)";
    await exec(read("sql/05_support_and_task_verification.sql"));
    ok("file dobara chalane par bhi kuch toota nahi (idempotent)");

    step = "support tables";
    for (const c of ["user_id", "subject", "message", "category", "priority", "status", "admin_reply", "created_at", "updated_at"]) {
      expect(await colExists("support_tickets", c), `support_tickets.${c} exists`);
    }
    for (const c of ["ticket_id", "sender_type", "sender_id", "sender_name", "body", "created_at"]) {
      expect(await colExists("support_ticket_messages", c), `support_ticket_messages.${c} exists`);
    }

    step = "ticket insert + thread";
    const user = (await q(`INSERT INTO public.users (telegram_id, first_name) VALUES (123456, 'Test') RETURNING id`))[0];
    const ticket = (await q(
      `INSERT INTO public.support_tickets (user_id, subject, message, category)
       VALUES ($1, 'Withdrawal pending', 'My withdrawal is stuck since 3 days', 'withdrawal') RETURNING id, status, priority`,
      [user.id]
    ))[0];
    expect(ticket.status === "open", "naya ticket default status = open");
    expect(ticket.priority === "normal", "naya ticket default priority = normal");

    await q(
      `INSERT INTO public.support_ticket_messages (ticket_id, sender_type, sender_id, sender_name, body)
       VALUES ($1, 'user', $2, '@tester', 'My withdrawal is stuck since 3 days')`,
      [ticket.id, user.id]
    );
    await q(
      `INSERT INTO public.support_ticket_messages (ticket_id, sender_type, sender_name, body)
       VALUES ($1, 'admin', 'support_team', 'We are checking it now.')`,
      [ticket.id]
    );
    const thread = await q(
      `SELECT sender_type FROM public.support_ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC`,
      [ticket.id]
    );
    expect(thread.length === 2, "ticket thread me user + admin dono messages save hue");

    step = "ticket updated_at trigger";
    await q(`UPDATE public.support_tickets SET status='in_progress' WHERE id=$1`, [ticket.id]);
    const touched = (await q(`SELECT updated_at, created_at FROM public.support_tickets WHERE id=$1`, [ticket.id]))[0];
    expect(new Date(touched.updated_at).getTime() >= new Date(touched.created_at).getTime(), "updated_at trigger chalta hai");

    step = "tasks verification columns";
    for (const c of ["target_id", "target_link", "sort_order", "is_active", "reward_coins", "updated_at"]) {
      expect(await colExists("tasks", c), `tasks.${c} exists`);
    }
    await q(
      `INSERT INTO public.tasks (title, type, reward_coins, target_id, target_link)
       VALUES ('Join @ludzo_news', 'channel_join', 25, '@ludzo_news', 'https://t.me/ludzo_news')`
    );
    const dup = await q(
      `INSERT INTO public.tasks (title, type, reward_coins, target_id)
       VALUES ('Duplicate', 'channel_join', 25, '@ludzo_news') RETURNING id`
    ).then(() => true).catch(() => false);
    expect(dup === false, "same channel par duplicate active task block hota hai (double reward guard)");

    step = "user_tasks unique guard";
    const taskId = (await q(`SELECT id FROM public.tasks LIMIT 1`))[0].id;
    await q(`INSERT INTO public.user_tasks (user_id, task_id, status) VALUES ($1, $2, 'in_progress')`, [user.id, taskId]);
    const dupUT = await q(
      `INSERT INTO public.user_tasks (user_id, task_id, status) VALUES ($1, $2, 'completed')`,
      [user.id, taskId]
    ).then(() => true).catch(() => false);
    expect(dupUT === false, "ek user + ek task = ek hi row (duplicate claim block)");

    step = "admin_logs: modern insert";
    const admin = (await q(`INSERT INTO public.admin_users (username, role) VALUES ('ludzo_admin', 'super') RETURNING id`))[0];
    await q(
      `INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'support_reply', 'support_ticket', $2, $3)`,
      [admin.id, ticket.id, JSON.stringify({ status: "in_progress" })]
    );
    const modern = (await q(`SELECT * FROM public.admin_logs WHERE action='support_reply'`))[0];
    expect(modern.admin_user === "ludzo_admin", "trigger ne admin_id se admin_user fill kiya");
    expect(modern.action_type === "support_reply", "trigger ne action ko action_type me mirror kiya");
    expect(modern.target === ticket.id, "trigger ne target_id ko target me mirror kiya");
    expect(typeof modern.details === "string", "details JSON string ke roop me save hota hai (React crash fix)");

    step = "admin_logs: legacy insert";
    await q(
      `INSERT INTO public.admin_logs (admin_user, action_type, target, details)
       VALUES ('old_admin', 'task_create', 'some-task-id', '{"title":"Join channel"}')`
    );
    const legacy = (await q(`SELECT * FROM public.admin_logs WHERE admin_user='old_admin'`))[0];
    expect(legacy.action === "task_create", "purane action_type insert se action column bhar gaya");
    expect(typeof legacy.details === "string", "legacy details text hi rehta hai (no crash)");

    step = "admin_logs: NULL-safe listing (logs page crash scenario)";
    const rows = await q(
      `SELECT id, COALESCE(action, action_type, 'unknown') AS action_type,
              COALESCE(admin_user, 'System') AS admin_user,
              COALESCE(details::text, '') AS details
       FROM public.admin_logs ORDER BY created_at DESC LIMIT 50`
    );
    expect(rows.length >= 2, "logs list query chal gayi (kai rows)");
    expect(rows.every((r) => typeof r.action_type === "string" && typeof r.admin_user === "string"), "har row me string action_type/admin_user");

    console.log("\n✅ sql/05 verification PASSED — support tickets, task verification columns, admin_logs legacy+modern all good.\n");
    process.exit(0);
  } catch (err) {
    fail(err?.message ?? String(err));
  }
})();
