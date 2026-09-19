/**
 * LUDZO — System / Bot Health migration (sql/11_system_health.sql) verification
 * ============================================================================
 * Real PostgreSQL 16 (in-process WASM via PGlite) pe do scenarios chalata hai:
 *
 *   A) PURANA DB — users/settings/ad_logs/ludo_* pehle se hain (bina last_seen
 *      column), migration ke baad:
 *        - users.last_seen column + partial index add hota hai
 *        - usage_daily / usage_minute tables bante hain (RLS on, no policies)
 *        - bump_usage_daily() atomic increment karta hai (race-safe, dobara
 *          run pe values double NAHI hoti)
 *        - get_active_users_count() last_seen window count deta hai
 *        - get_db_size() / get_table_sizes() / get_connection_stats() /
 *          get_hourly_activity() sab kaam karte hain
 *        - capacity settings seed hoti hain (warn mode default)
 *        - anon ko EXECUTE nahi milta (service_role ko milta hai)
 *        - file dobara run karna (idempotent) safe hai
 *
 *   B) FRESH DB — kuch bhi nahi hai (sirf roles), migration khud sab banata hai.
 *
 *     npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-system-sql.js
 *
 * Exit 0 = sab checks pass. Exit 1 = pehla failing check print hota hai.
 */
const fs   = require("fs");
const path = require("path");

// Resolve PGlite from local node_modules or the npx cache (same trick as
// verify-moderators-sql.js).
let PGlite;
try {
  const lookupPaths = [process.cwd(), __dirname, ...(process.env.NODE_PATH ?? "").split(path.delimiter).filter(Boolean)];
  const npxRoot = process.env.HOME ? path.join(process.env.HOME, ".npm", "_npx") : "";
  if (npxRoot && fs.existsSync(npxRoot)) {
    for (const entry of fs.readdirSync(npxRoot)) {
      lookupPaths.push(path.join(npxRoot, entry, "node_modules"));
    }
  }

  let resolved;
  for (const lookupPath of lookupPaths) {
    try {
      resolved = require.resolve("@electric-sql/pglite", { paths: [lookupPath] });
      break;
    } catch {
      // Try the next package location.
    }
  }
  if (!resolved) throw new Error("module not found");
  ({ PGlite } = require(resolved));
} catch {
  console.error("PGlite not found. Run:\n  npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-system-sql.js");
  process.exit(2);
}

const REPO = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(`${REPO}/${p}`, "utf8");

const MIGRATION = read("sql/11_system_health.sql");

// Supabase roles bootstrap — PGlite pe ye roles nahi hote.
const BASE = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
`;

// Purane production DB ki shakal: core tables hai, par last_seen / usage_* nahi.
const LEGACY_SCHEMA = `
CREATE TABLE public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id   bigint,
  first_name    text,
  status        text DEFAULT 'active',
  created_at    timestamptz DEFAULT now()
);
CREATE TABLE public.settings (
  key   text PRIMARY KEY,
  value text
);
CREATE TABLE public.ad_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  ad_type    text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.ludo_match_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  room_id    uuid,
  result     text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.admin_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text,
  created_at timestamptz DEFAULT now()
);
`;

let failures = 0;
const check = (name, cond, extra = "") => {
  if (cond) {
    console.log(`  ✅ ${name}`);
  } else {
    failures += 1;
    console.error(`  ❌ ${name}${extra ? ` — ${extra}` : ""}`);
  }
};

async function scenarioLegacyDb() {
  console.log("\n[A] Legacy DB (users exists, no last_seen / usage tables)");
  const db = new PGlite();
  await db.exec(BASE);
  await db.exec(LEGACY_SCHEMA);

  // Sample data — active users, ads, matches, signups
  await db.query(`
    INSERT INTO public.users (id, first_name, created_at) VALUES
      ('11111111-1111-1111-1111-111111111111', 'fresh_now',   now()),
      ('22222222-2222-2222-2222-222222222222', 'old_seen',    now() - interval '30 minutes'),
      ('33333333-3333-3333-3333-333333333333', 'never_seen',  now() - interval '3 days')
  `);
  await db.query(`
    INSERT INTO public.ad_logs (user_id, created_at) VALUES
      ('11111111-1111-1111-1111-111111111111', now()),
      ('22222222-2222-2222-2222-222222222222', now() - interval '2 hours')
  `);
  await db.query(`
    INSERT INTO public.ludo_match_history (user_id, room_id, created_at) VALUES
      ('11111111-1111-1111-1111-111111111111', 'aaaa1111-0000-0000-0000-000000000001', now()),
      ('22222222-2222-2222-2222-222222222222', 'aaaa1111-0000-0000-0000-000000000001', now())
  `);

  await db.exec(MIGRATION);

  // 1. last_seen column + backfill-free behavior
  const cols = await db.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_seen'
  `);
  check("users.last_seen column added", cols.rows.length === 1);

  const idx = await db.query(`
    SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'users' AND indexname = 'idx_users_last_seen'
  `);
  check("idx_users_last_seen created", idx.rows.length === 1);

  // 2. usage tables
  for (const t of ["usage_daily", "usage_minute"]) {
    const tbl = await db.query(`SELECT to_regclass('public.${t}') AS t`);
    check(`table ${t} created`, tbl.rows[0]?.t === t);
  }
  const rls = await db.query(`
    SELECT relname, relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND relname IN ('usage_daily','usage_minute')
  `);
  check("usage tables have RLS enabled", rls.rows.length === 2 && rls.rows.every((r) => r.relrowsecurity === true));

  // 3. bump_usage_daily — atomic increments
  const today = (await db.query(`SELECT current_date::text AS d`)).rows[0].d;
  await db.query(
    `SELECT public.bump_usage_daily($1::date, now(), 10, 5, 2)`, [today]
  );
  await db.query(
    `SELECT public.bump_usage_daily($1::date, now(), 7, 1, 0)`, [today]
  );
  const daily = await db.query(`SELECT * FROM public.usage_daily WHERE date = current_date`);
  check("bump_usage_daily increments daily row",
    Number(daily.rows[0]?.api_requests) === 17 &&
    Number(daily.rows[0]?.game_polls) === 6 &&
    Number(daily.rows[0]?.match_actions) === 2);

  const minuteRows = await db.query(`SELECT * FROM public.usage_minute`);
  check("bump_usage_daily writes minute sample",
    minuteRows.rows.length === 1 &&
    Number(minuteRows.rows[0]?.api_requests) === 17 &&
    Number(minuteRows.rows[0]?.game_polls) === 6);

  // Same minute me dobara bump — minute row merge hona chahiye, nayi row nahi
  await db.query(
    `SELECT public.bump_usage_daily($1::date, now(), 1, 1, 1)`, [today]
  );
  const minuteRows2 = await db.query(`SELECT count(*)::int AS n FROM public.usage_minute`);
  const daily2 = await db.query(`SELECT api_requests FROM public.usage_daily WHERE date = current_date`);
  check("bump merges into same minute bucket (no duplicate rows)",
    minuteRows2.rows[0]?.n === 1 && Number(daily2.rows[0]?.api_requests) === 18);

  // 4. get_active_users_count
  await db.query(`UPDATE public.users SET last_seen = now() - interval '2 minutes' WHERE first_name = 'old_seen'`);
  const active = await db.query(`SELECT public.get_active_users_count(5) AS n`);
  check("get_active_users_count(5) counts only recent last_seen",
    Number(active.rows[0]?.n) === 1); // sirf old_seen (fresh_now ka last_seen NULL hai)
  await db.query(`UPDATE public.users SET last_seen = now() WHERE first_name = 'never_seen'`);
  const active2 = await db.query(`SELECT public.get_active_users_count(5) AS n`);
  check("get_active_users_count picks up newly touched users",
    Number(active2.rows[0]?.n) === 2);

  // 5. DB health RPCs
  const size = await db.query(`SELECT public.get_db_size() AS s`);
  check("get_db_size returns positive number", Number(size.rows[0]?.s) > 0);

  const tables = await db.query(`SELECT * FROM public.get_table_sizes()`);
  const names = tables.rows.map((r) => r.table_name);
  check("get_table_sizes lists tables", tables.rows.length > 0 && names.includes("users") && names.includes("ad_logs"));

  const conns = await db.query(`SELECT * FROM public.get_connection_stats()`);
  check("get_connection_stats returns counts",
    Number(conns.rows[0]?.total_connections) >= 1 &&
    Number(conns.rows[0]?.max_connections_setting) > 0);

  // 6. get_hourly_activity — 24 hours, sahi aggregation
  const hourly = await db.query(`SELECT * FROM public.get_hourly_activity(7)`);
  check("get_hourly_activity returns 24 hour rows", hourly.rows.length === 24);
  const totalAds = hourly.rows.reduce((s, r) => s + Number(r.ad_plays), 0);
  const totalMatches = hourly.rows.reduce((s, r) => s + Number(r.matches), 0);
  const totalSignups = hourly.rows.reduce((s, r) => s + Number(r.signups), 0);
  const totalRequests = hourly.rows.reduce((s, r) => s + Number(r.requests), 0);
  check("get_hourly_activity aggregates ad plays", totalAds === 2);
  check("get_hourly_activity aggregates distinct matches", totalMatches === 1);
  check("get_hourly_activity aggregates signups", totalSignups === 3);
  // 18 api + 7 polls + 3 actions = 28 total requests
  check("get_hourly_activity aggregates usage_minute requests", totalRequests === 28);
  const hoursSorted = hourly.rows.every((r, i) => Number(r.hour_of_day) === i);
  check("get_hourly_activity rows ordered 0..23", hoursSorted);

  // 6b. get_daily_activity — per-day counts
  const dailyAct = await db.query(`SELECT * FROM public.get_daily_activity(7)`);
  // PGlite date columns JS Date objects ke roop me aate hain — normalize karo.
  const asDay = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
  const actToday = dailyAct.rows.find((r) => asDay(r.day) === today);
  check("get_daily_activity returns p_days rows", dailyAct.rows.length === 7);
  check("get_daily_activity aggregates today",
    Number(actToday?.signups) === 2 && // never_seen 3 din pehle bana tha
    Number(actToday?.matches) === 1 &&
    Number(actToday?.ad_plays) === 2 &&
    Number(actToday?.requests) === 28);

  // 7. Capacity settings seed
  const settings = await db.query(`SELECT key, value FROM public.settings`);
  const map = Object.fromEntries(settings.rows.map((r) => [r.key, r.value]));
  check("capacity settings seeded",
    map.max_concurrent_users === "200" &&
    map.max_concurrent_matches === "100" &&
    map.max_queue_capacity === "500" &&
    map.capacity_enforcement === "warn" &&
    typeof map.server_full_message === "string" && map.server_full_message.length > 10);

  // 8. Permissions — real role-switch test (PGlite me has_function_privilege
  //    kaam nahi karta, isliye asli SET ROLE se execute karke dekhte hain).
  let anonRejected = false;
  try {
    await db.query(`SET ROLE anon`);
    await db.query(`SELECT public.bump_usage_daily(current_date, now(), 0, 0, 0)`);
  } catch {
    anonRejected = true; // permission denied — yahi expected hai
  } finally {
    await db.query(`RESET ROLE`);
  }
  check("anon CANNOT execute bump_usage_daily", anonRejected);

  let svcOk = false;
  try {
    await db.query(`SET ROLE service_role`);
    await db.query(`SELECT public.bump_usage_daily(current_date, now(), 0, 0, 0)`);
    await db.query(`SELECT public.get_db_size()`);
    svcOk = true;
  } catch {
    svcOk = false;
  } finally {
    await db.query(`RESET ROLE`);
  }
  check("service_role CAN execute bump_usage_daily + get_db_size", svcOk);

  // 9. Idempotency — dobara chalao, kuch na toote
  await db.exec(MIGRATION);
  const dailyAfter = await db.query(`SELECT * FROM public.usage_daily WHERE date = current_date`);
  check("idempotent re-run keeps usage counts intact",
    Number(dailyAfter.rows[0]?.api_requests) === 18 && Number(dailyAfter.rows[0]?.game_polls) === 7);
  const settingsAfter = await db.query(`SELECT count(*)::int AS n FROM public.settings`);
  check("idempotent re-run does not duplicate settings", settingsAfter.rows[0]?.n === 5);

  await db.close();
}

async function scenarioFreshDb() {
  console.log("\n[B] Fresh DB (core tables empty, koi system-health object nahi)");
  const db = new PGlite();
  await db.exec(BASE);

  // get_hourly_activity SQL function body create-time pe parse hota hai, aur
  // users/ad_logs/ludo_match_history core schema ke tables hain (production
  // me hamesha exist karte hain) — isliye minimal shapes pehle banao.
  await db.exec(`
CREATE TABLE public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now()
);
CREATE TABLE public.ad_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.ludo_match_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.settings (
  key   text PRIMARY KEY,
  value text
);
`);

  await db.exec(MIGRATION);

  const tables = await db.query(`
    SELECT to_regclass('public.usage_daily') AS a, to_regclass('public.usage_minute') AS b
  `);
  check("fresh DB — usage tables created", !!tables.rows[0]?.a && !!tables.rows[0]?.b);

  const col = await db.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='users' AND column_name='last_seen'
  `);
  check("fresh DB — users.last_seen added", col.rows.length === 1);

  await db.query(`SELECT public.bump_usage_daily(current_date, now(), 1, 1, 1)`);
  const daily = await db.query(`SELECT api_requests, game_polls, match_actions FROM public.usage_daily`);
  check("fresh DB — bump works on first call",
    Number(daily.rows[0]?.api_requests) === 1 &&
    Number(daily.rows[0]?.game_polls) === 1 &&
    Number(daily.rows[0]?.match_actions) === 1);

  const empty = await db.query(`SELECT * FROM public.get_hourly_activity(7)`);
  const totalReqs = empty.rows.reduce((s, r) => s + Number(r.requests), 0);
  check("fresh DB — get_hourly_activity returns 24 rows",
    empty.rows.length === 24 && totalReqs === 3 &&
    empty.rows.every((r) => Number(r.ad_plays) === 0 && Number(r.signups) === 0));

  await db.close();
}

(async () => {
  try {
    await scenarioLegacyDb();
    await scenarioFreshDb();
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
    process.exit(1);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
  }
  console.log("\n🎉 sql/11_system_health.sql — all checks passed.");
})();
