/**
 * LUDZO — Moderator migration (sql/10_moderators.sql) verification
 * ============================================================================
 * Real PostgreSQL 16 (in-process WASM via PGlite) pe do scenarios chalata hai:
 *
 *   A) PURANA DB — admin_users pehle se hai (bina role/is_active columns),
 *      migration ke baad columns add ho jaate hain, purane rows 'admin' ban
 *      jaate hain, moderator insert hota hai, invalid role CHECK se reject
 *      hota hai, aur file dobara run karna (idempotent) safe hai.
 *
 *   B) FRESH DB — admin_users bilkul nahi hai, migration table khud banata hai.
 *
 *     npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-moderators-sql.js
 *
 * Exit 0 = sab checks pass. Exit 1 = pehla failing check print hota hai.
 */
const fs   = require("fs");
const path = require("path");

// Resolve PGlite from local node_modules or the npx cache (same trick as
// verify-ludo-sql.js).
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
  console.error("PGlite not found. Run:\n  npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-moderators-sql.js");
  process.exit(2);
}

const REPO = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(`${REPO}/${p}`, "utf8");

const MIGRATION = read("sql/10_moderators.sql");

// Supabase roles bootstrap — PGlite pe ye roles nahi hote.
const BASE = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
`;

// Purane production DB ki shakal: admin_users hai, par role/is_active nahi.
const LEGACY_ADMIN_USERS = `
CREATE TABLE public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL
);
INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
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
  console.log("\n[A] Legacy DB (admin_users exists, no role column)");
  const db = new PGlite();
  await db.exec(BASE);
  await db.exec(LEGACY_ADMIN_USERS);

  await db.exec(MIGRATION);

  const cols = await db.query(`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'admin_users'
  `);
  const colNames = cols.rows.map((r) => r.column_name);
  for (const expected of ["role", "is_active", "created_by", "created_at", "updated_at"]) {
    check(`column ${expected} added`, colNames.includes(expected));
  }

  const legacy = await db.query(`SELECT role, is_active FROM public.admin_users WHERE username = 'admin'`);
  check("existing admin backfilled to role=admin", legacy.rows[0]?.role === "admin");
  check("existing admin stays active", legacy.rows[0]?.is_active === true);

  await db.query(`
    INSERT INTO public.admin_users (username, password_hash, role, is_active)
    VALUES ('mod_test', '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', 'moderator', true)
  `);
  const mod = await db.query(`SELECT role FROM public.admin_users WHERE username = 'mod_test'`);
  check("moderator insert works", mod.rows[0]?.role === "moderator");

  let rejected = false;
  try {
    await db.query(`INSERT INTO public.admin_users (username, password_hash, role) VALUES ('x', 'y', 'superuser')`);
  } catch {
    rejected = true;
  }
  check("invalid role rejected by CHECK", rejected);

  // updated_at trigger fires
  await db.query(`UPDATE public.admin_users SET is_active = false WHERE username = 'mod_test'`);
  const touched = await db.query(`SELECT updated_at > now() - interval '5 seconds' AS ok FROM public.admin_users WHERE username = 'mod_test'`);
  check("updated_at trigger fires", touched.rows[0]?.ok === true);

  // Idempotency — dobara chalao.
  await db.exec(MIGRATION);
  const after = await db.query(`SELECT count(*)::int AS n FROM public.admin_users`);
  check("idempotent re-run keeps rows intact", after.rows[0]?.n === 2);

  await db.close();
}

async function scenarioFreshDb() {
  console.log("\n[B] Fresh DB (no admin_users table)");
  const db = new PGlite();
  await db.exec(BASE);

  await db.exec(MIGRATION);

  const table = await db.query(`SELECT to_regclass('public.admin_users') AS t`);
  check("admin_users created", table.rows[0]?.t === "admin_users");

  await db.query(`
    INSERT INTO public.admin_users (username, password_hash, role)
    VALUES ('owner', 'aaa94021cb59b0e81bd85c6d36e8dbf46c5f09dce5b8a43f1a46f3bd6c51a0d9', 'admin'),
           ('mod1', 'f6485f7ff1c3e0d2f4a33a16d1c21a27d6d1721f70e27f02d73d709fd3f63b9b', 'moderator')
  `);
  const rows = await db.query(`SELECT username, role FROM public.admin_users ORDER BY username`);
  check("fresh table accepts admin + moderator", rows.rows.length === 2);

  const idx = await db.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'admin_users' AND indexname = 'admin_users_role_idx'`);
  check("role index created", idx.rows.length === 1);

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
  console.log("\n🎉 sql/10_moderators.sql — all checks passed.");
})();
