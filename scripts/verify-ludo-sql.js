/**
 * LUDZO — SQL migration verification
 * ============================================================================
 * Applies the shipped schema/migrations (01 → 02 → 03 → 04 → 07 → 08 → 99)
 * to a REAL PostgreSQL 16 (in-process WASM via PGlite — nothing to install, no
 * Docker), then drives the whole matchmaking →
 * activate → turn-timeout → reactions → settle → bot fallback → janitor flow
 * and asserts wallets/history/stats line up.
 *
 *     npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-ludo-sql.js
 *
 * Exit 0 = every check passed. Exit 1 = first failing check is printed.
 */
const fs   = require("fs");
const path = require("path");

// Resolve PGlite from wherever it was installed (local node_modules, npx -p,
// or a global). Modern npx versions do not always add -p packages to
// NODE_PATH, so explicitly inspect its cache as a fallback.
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
  console.error("PGlite not found. Run:\n  npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-ludo-sql.js");
  process.exit(2);
}

const REPO = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(`${REPO}/${p}`, "utf8");

// Supabase has these roles; a bare Postgres does not.
const BASE = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')          THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role')  THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint,
  first_name text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  coin_balance integer NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  usdt_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  commission_amount integer NOT NULL DEFAULT 0,
  commission_status text NOT NULL DEFAULT 'pending',
  first_deposit_processed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text
);
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coin_amount integer,
  usdt_amount numeric,
  payment_id text,
  status text DEFAULT 'pending',
  credited_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type text,
  currency text,
  amount numeric,
  status text,
  reference_id text,
  description text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  wallet_address text NOT NULL,
  network text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
`;

let step = "";
const fail = (m) => { console.error(`\n❌ FAIL @ ${step}: ${m}`); process.exit(1); };
const ok = (m) => console.log(`  ✅ ${m}`);
const expect = (cond, m) => cond ? ok(m) : fail(m);

(async () => {
  const db = new PGlite();
  const q = async (sql, params) => (await db.query(sql, params)).rows;
  const exec = async (sql) => db.exec(sql);

  // PGlite has no pg_cron; stub the parts 03 touches so the DO block takes the
  // "not enabled" branch, and CREATE EXTENSION doesn't blow up.
  step = "base schema";
  await exec(BASE);
  ok("base users/wallets/auth stubs created");

  step = "01_ludo_schema.sql";
  await exec(read("sql/01_ludo_schema.sql"));
  ok("01 applied");

  step = "02_ludo_fixes.sql (first run)";
  await exec(read("sql/02_ludo_fixes.sql"));
  ok("02 applied");

  step = "02_ludo_fixes.sql (second run — idempotency)";
  await exec(read("sql/02_ludo_fixes.sql"));
  ok("02 re-applied without error");

  step = "03_ludo_cron.sql";
  let cronSql = read("sql/03_ludo_cron.sql")
    .replace("CREATE EXTENSION IF NOT EXISTS pg_cron;", "-- (pg_cron unavailable in test harness)");
  await exec(cronSql);
  await exec(cronSql);
  ok("03 applied twice (janitor function installed, schedule step skipped gracefully)");

  step = "04_ludo_two_tokens_cleanup.sql";
  const sql04 = read("sql/04_ludo_two_tokens_cleanup.sql");
  await exec(sql04);
  await exec(sql04);   // idempotent re-run
  ok("04 applied twice (2-token boards + janitor one-shot, cron step skipped gracefully)");

  step = "07_arena_players.sql (first run)";
  await exec(read("sql/07_arena_players.sql"));
  ok("07 applied (display profiles dropped, roster seeded, 20–28 s matchmaking installed)");

  step = "07_arena_players.sql (second run — idempotency)";
  await exec(read("sql/07_arena_players.sql"));
  ok("07 re-applied without error");

  step = "08_coin_economy_and_won_withdrawals.sql";
  await exec(read("sql/08_coin_economy_and_won_withdrawals.sql"));
  await exec(read("sql/08_coin_economy_and_won_withdrawals.sql"));
  ok("08 applied twice (two ledgers, fixed rate, and atomic conversion are idempotent)");

  step = "arena roster";
  {
    const [roster] = await q(`SELECT
        count(*)::int                                            AS total,
        count(*) FILTER (WHERE active)::int                      AS active,
        count(*) FILTER (WHERE bot_name LIKE 'Bot %' OR bot_name LIKE 'bot\\_%')::int AS old_bots
      FROM public.ludo_bot_profiles`);
    expect(roster.total === 20 && roster.active === 20,
           `roster holds exactly 20 active arena players (total ${roster.total}, active ${roster.active})`);
    expect(roster.old_bots === 0, "old 'Bot …' profiles are gone");

    const names = await q(`SELECT bot_name FROM public.ludo_bot_profiles ORDER BY bot_name`);
    const female = ["Riya Sharma", "Ananya Verma", "Priya Nair", "Sneha Patel", "Kavya Iyer"];
    const male   = ["Aarav Mehta", "Rohit Kumar", "Vikram Singh", "Arjun Reddy", "Karan Malhotra",
                    "Sahil Khan", "Aditya Rao", "Manish Gupta", "Rahul Yadav", "Nikhil Joshi",
                    "Ishaan Bose", "Devansh Chauhan", "Suresh Menon", "Harsh Vardhan", "Yash Thakur"];
    const got = names.map(n => n.bot_name);
    expect(female.every(n => got.includes(n)), "all 5 female arena names present");
    expect(male.every(n => got.includes(n)), "all 15 male arena names present");
    expect(got.every(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)),
           "every roster name is a real two-word human name (no 'Bot …')");

    const [drop] = await q(`SELECT to_regclass('public.ludo_display_profiles') AS t`);
    expect(drop.t === null, "ludo_display_profiles table is dropped (Display Profiles feature removed)");

    const [col] = await q(`SELECT count(*)::int AS n FROM information_schema.columns
                           WHERE table_schema='public' AND table_name='ludo_queues' AND column_name='bot_after_secs'`);
    expect(col.n === 1, "ludo_queues.bot_after_secs exists");
  }

  step = "99_verify.sql";
  const verifyResults = await db.exec(read("sql/99_verify.sql"));
  const verifyRows = verifyResults.find(r => r.rows && r.rows.length && r.rows[0].status)?.rows ?? [];
  expect(verifyRows.length >= 25, `verify returned ${verifyRows.length} check rows`);
  const snap = verifyResults.find(r => r.rows && r.rows.length && "waiting_in_queue" in r.rows[0])?.rows?.[0];
  expect(!!snap, `live snapshot row returned ${JSON.stringify(snap)}`);
  const fails = verifyRows.filter(r => !r.status.includes("PASS") && r.category !== "cron");
  for (const r of verifyRows) console.log(`     ${r.status}  ${r.category.padEnd(8)} ${r.item}`);
  expect(fails.length === 0, `all non-cron verify checks pass (${fails.length} failing)`);

  // ── Seed two humans ──────────────────────────────────────────────────────
  step = "seed users";
  const [u1] = await q(`INSERT INTO users (first_name, photo_url) VALUES ('Aarav','') RETURNING id`);
  const [u2] = await q(`INSERT INTO users (first_name, photo_url) VALUES ('Diya','')  RETURNING id`);
  await exec(`INSERT INTO wallets (user_id, coin_balance) VALUES ('${u1.id}', 1000), ('${u2.id}', 1000)`);
  const stats = await q(`SELECT count(*)::int AS n FROM ludo_stats WHERE user_id IN ('${u1.id}','${u2.id}')`);
  expect(stats[0].n === 2, "ludo_stats rows auto-created by trigger for both users");

  // ── Human vs human matchmaking ───────────────────────────────────────────
  step = "join_ludo_queue u1";
  const [{ join_ludo_queue: q1 }] = await q(`SELECT join_ludo_queue('${u1.id}', 100)`);
  let w = await q(`SELECT coin_balance FROM wallets WHERE user_id='${u1.id}'`);
  expect(w[0].coin_balance === 900, "u1 stake escrowed (1000 → 900)");

  step = "double join is rejected + rolled back";
  let threw = false;
  try { await q(`SELECT join_ludo_queue('${u1.id}', 200)`); } catch (e) { threw = /already waiting/i.test(e.message); }
  w = await q(`SELECT coin_balance FROM wallets WHERE user_id='${u1.id}'`);
  expect(threw && w[0].coin_balance === 900, "second join raised 'already waiting' and did NOT debit again");

  step = "match_ludo_queue u1 alone";
  let [{ match_ludo_queue: m1 }] = await q(`SELECT match_ludo_queue('${q1}', '${u1.id}')`);
  expect(m1.matched === false && m1.cancelled !== true, `u1 alone → waiting (${JSON.stringify(m1)})`);

  step = "join + match u2";
  const [{ join_ludo_queue: q2 }] = await q(`SELECT join_ludo_queue('${u2.id}', 100)`);
  let [{ match_ludo_queue: m2 }] = await q(`SELECT match_ludo_queue('${q2}', '${u2.id}')`);
  expect(m2.matched === true && m2.match_type === "human" && m2.opponent_id === u1.id,
         `u2 matched with u1 (room ${m2.room_id})`);
  const roomId = m2.room_id;

  step = "u1 poll sees the same room";
  [{ match_ludo_queue: m1 }] = await q(`SELECT match_ludo_queue('${q1}', '${u1.id}')`);
  expect(m1.matched === true && m1.room_id === roomId, "u1's next poll returns the same room (idempotent)");

  step = "room shape";
  let [room] = await q(`SELECT * FROM ludo_rooms WHERE id='${roomId}'`);
  expect(room.status === "countdown", "room starts in countdown");
  expect(room.player_1_id === u1.id && room.player_2_id === u2.id, "longer-waiting player is player_1");
  expect(JSON.stringify(room.board_state.pieces.player_1) === "[0,0]", "fresh room seeded with 2-token board");
  expect(room.turn_player_id === u1.id, "turn_player_id set");

  step = "legacy 4-token board compatibility";
  {
    const [uL] = await q(`INSERT INTO users (first_name) VALUES ('Legacy') RETURNING id`);
    const [{ id: legacyId }] = await q(
      `INSERT INTO ludo_rooms (stake, player_1_id, player_2_id, status, board_state, turn_player_id)
       VALUES (50, '${uL.id}', 'bot_legacy', 'countdown',
               '{"pieces":{"player_1":[0,0,0,0],"player_2":[0,0,0,0]}}', '${uL.id}') RETURNING id`);
    await q(`SELECT activate_ludo_room('${legacyId}')`);
    const [lr] = await q(`SELECT status, board_state FROM ludo_rooms WHERE id='${legacyId}'`);
    expect(lr.status === "active" &&
           JSON.stringify(lr.board_state.pieces.player_1) === "[0,0,0,0]",
           "legacy 4-token board preserved through activation (engine is length-generic)");
    await q(`DELETE FROM ludo_rooms WHERE id='${legacyId}'`);
  }

  step = "cannot join queue while in a live room";
  threw = false;
  try { await q(`SELECT join_ludo_queue('${u1.id}', 50)`); } catch (e) { threw = /live match/i.test(e.message); }
  expect(threw, "join_ludo_queue refuses while a countdown/active room exists");

  step = "activate_ludo_room";
  const [{ activate_ludo_room: act1 }] = await q(`SELECT activate_ludo_room('${roomId}')`);
  const [{ activate_ludo_room: act2 }] = await q(`SELECT activate_ludo_room('${roomId}')`);
  [room] = await q(`SELECT * FROM ludo_rooms WHERE id='${roomId}'`);
  expect(act1 === true && act2 === false, "activate returns true once, false on the second (CAS)");
  expect(room.status === "active" && room.match_start_time !== null, "room active with match_start_time");
  expect([u1.id, u2.id].includes(room.turn_player_id), "first turn is one of the two seats");
  expect(room.consecutive_sixes === 0 && room.dice_rolled === false, "turn fields reset");

  // first-move fairness over many rooms
  step = "first-move fairness";
  // u1 is still seated in the live room above, so the one-live-room index
  // (correctly) refuses another room for u1 — use a dedicated user.
  const [u3] = await q(`INSERT INTO users (first_name) VALUES ('Fairness') RETURNING id`);
  let p1First = 0;
  for (let i = 0; i < 200; i++) {
    const [{ id }] = await q(`INSERT INTO ludo_rooms (stake, player_1_id, player_2_id, status, board_state, turn_player_id)
                              VALUES (50, '${u3.id}', 'bot_fair', 'countdown', '{}', '${u3.id}') RETURNING id`);
    await q(`SELECT activate_ludo_room('${id}')`);
    const [r] = await q(`SELECT turn_player_id FROM ludo_rooms WHERE id='${id}'`);
    if (r.turn_player_id === u3.id) p1First++;
    await q(`DELETE FROM ludo_rooms WHERE id='${id}'`);
  }
  expect(p1First > 60 && p1First < 140, `player_1 moves first in ${p1First}/200 activations (≈50%)`);

  step = "advance_ludo_turn CAS";
  [room] = await q(`SELECT turn_player_id, turn_start_at FROM ludo_rooms WHERE id='${roomId}'`);
  const other = room.turn_player_id === u1.id ? u2.id : u1.id;
  const ts = room.turn_start_at.toISOString();
  const [{ advance_ludo_turn: a1 }] = await q(
    `SELECT advance_ludo_turn('${roomId}', '${room.turn_player_id}', '${ts}', '${other}', 2, 3)`);
  const [{ advance_ludo_turn: a2 }] = await q(
    `SELECT advance_ludo_turn('${roomId}', '${room.turn_player_id}', '${ts}', '${other}', 1, 3)`);
  const [after] = await q(`SELECT turn_player_id, hearts_player_1, hearts_player_2 FROM ludo_rooms WHERE id='${roomId}'`);
  expect(a1 === true && a2 === false, "first advance wins, replay with stale turn_start_at is rejected");
  expect(after.turn_player_id === other, "turn switched to the other player");
  expect(after.hearts_player_1 === 2, "hearts written exactly once (2, not 1)");

  step = "append_ludo_reaction";
  for (let i = 0; i < 25; i++) {
    await q(`SELECT append_ludo_reaction('${roomId}', $1::jsonb, 20)`, [JSON.stringify({ player_id: u1.id, type: "Fire", timestamp: i })]);
  }
  [room] = await q(`SELECT chat_reactions FROM ludo_rooms WHERE id='${roomId}'`);
  expect(room.chat_reactions.length === 20, "reactions capped at 20");
  expect(room.chat_reactions[19].timestamp === 24 && room.chat_reactions[0].timestamp === 5,
         "oldest dropped, order preserved (5..24)");

  step = "settle_ludo_match";
  threw = false;
  try { await q(`SELECT settle_ludo_match('${roomId}', '${u1.id}', 'bot_nobody', 'normal', 100)`); }
  catch (e) { threw = /do not match room/i.test(e.message); }
  expect(threw, "settle refuses a winner/loser pair that isn't the seated players");

  const [{ settle_ludo_match: s1 }] = await q(`SELECT settle_ludo_match('${roomId}', '${u2.id}', '${u1.id}', 'normal', 123)`);
  const [{ settle_ludo_match: s2 }] = await q(`SELECT settle_ludo_match('${roomId}', '${u1.id}', '${u2.id}', 'normal', 123)`);
  expect(s1 === true && s2 === false, "settle succeeds once; the second (reversed!) call is a no-op");

  const [w1] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u1.id}'`);
  const [w2] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u2.id}'`);
  expect(w2.won_coins_balance === 196, `winner u2 got floor(200*0.98)=196 won coins (got ${w2.won_coins_balance})`);
  expect(w1.won_coins_balance === 0 && w1.coin_balance === 900, "loser u1 got nothing, stake stays spent");

  const hist = await q(`SELECT user_id, result, reward, opponent_name FROM ludo_match_history WHERE room_id='${roomId}' ORDER BY result`);
  expect(hist.length === 2, "two history rows");
  expect(hist.find(h => h.result === "win").opponent_name === "Aarav", "winner's row names the loser");
  const st2 = (await q(`SELECT wins, total_matches, win_rate, current_streak FROM ludo_stats WHERE user_id='${u2.id}'`))[0];
  expect(st2.wins === 1 && st2.total_matches === 1 && st2.win_rate === "100%" && st2.current_streak === 1, "winner stats updated");
  const settle = (await q(`SELECT * FROM ludo_settlements WHERE room_id='${roomId}'`))[0];
  expect(settle && settle.reward === 196 && settle.platform_fee === 4 && settle.bot_match === false, "settlement audit row written (fee 4)");

  // ── Two-ledger economy + withdrawal guardrails ───────────────────────────
  step = "two-ledger economy";
  const [rate] = await q(`SELECT value FROM settings WHERE key='coin_rate'`);
  expect(rate.value === "200", "coin_rate is fixed at 200 Coins per $1");
  const [beforeEconomy] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u2.id}'`);
  await q(`INSERT INTO referrals (referrer_id, referee_id) VALUES ('${u1.id}', '${u2.id}')`);
  const [{ id: depositId }] = await q(`INSERT INTO deposits (user_id, coin_amount, status, payment_id)
      VALUES ('${u2.id}', 400, 'pending', 'economy-test') RETURNING id`);
  const [{ credit_playable_coins_for_deposit: deposited }] = await q(
    `SELECT credit_playable_coins_for_deposit('${depositId}', '${u2.id}', 400, 'economy-test')`);
  const [{ credit_playable_coins_for_deposit: duplicateDeposit }] = await q(
    `SELECT credit_playable_coins_for_deposit('${depositId}', '${u2.id}', 400, 'economy-test')`);
  const [beforeReferrer] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u1.id}'`);
  const [{ settle_referral_playable_coins: referralCoins }] = await q(
    `SELECT settle_referral_playable_coins('${u2.id}', 400, 10)`);
  const [{ settle_referral_playable_coins: duplicateReferral }] = await q(
    `SELECT settle_referral_playable_coins('${u2.id}', 400, 10)`);
  const [afterReferrer] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u1.id}'`);
  const [afterDeposit] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u2.id}'`);
  expect(deposited === true && duplicateDeposit === false &&
         afterDeposit.coin_balance === beforeEconomy.coin_balance + 400 &&
         afterDeposit.won_coins_balance === beforeEconomy.won_coins_balance,
         "deposits credit playable Coins exactly once and never Won Coins");
  expect(referralCoins === 40 && duplicateReferral === 0 &&
         afterReferrer.coin_balance === beforeReferrer.coin_balance + 40 &&
         afterReferrer.won_coins_balance === beforeReferrer.won_coins_balance,
         "referral reward is playable Coins, never Won Coins, and settles once");

  await q(`SELECT credit_won_coins('${u2.id}', 1004, 'ludo_prize')`);
  let invalidWithdrawal = false;
  try {
    await q(`SELECT create_ludo_won_withdrawal('${u2.id}', 800, 'T${"x".repeat(33)}', 5, 'TRC20')`);
  } catch (e) {
    invalidWithdrawal = /minimum|200-Coin/i.test(e.message);
  }
  expect(invalidWithdrawal, "withdrawal RPC rejects amounts below the exact 1,000-Coin minimum");
  const [{ create_ludo_won_withdrawal: withdrawalId }] = await q(
    `SELECT create_ludo_won_withdrawal('${u2.id}', 1000, 'T${"x".repeat(33)}', 5, 'TRC20')`);
  const [afterWithdrawal] = await q(`SELECT coin_balance, won_coins_balance FROM wallets WHERE user_id='${u2.id}'`);
  const [withdrawal] = await q(`SELECT coin_amount, amount, fee_amount, net_amount, source, network
                                FROM withdrawals WHERE id='${withdrawalId}'`);
  expect(afterWithdrawal.coin_balance === afterDeposit.coin_balance && afterWithdrawal.won_coins_balance === 200,
         "conversion debits only the locked Won-Coin ledger");
  expect(withdrawal.coin_amount === 1000 && withdrawal.amount === "5.00" &&
         withdrawal.fee_amount === "0.25" && withdrawal.net_amount === "4.75" &&
         withdrawal.source === "ludo_won" && withdrawal.network === "TRC20",
         "1,000 Won Coins settle to $5 gross, $0.25 fee, and $4.75 net on the selected network");

  // A TRC20 request must reject an EVM address (network-aware validation).
  let mismatchedNetwork = false;
  try {
    await q(`SELECT create_ludo_won_withdrawal('${u2.id}', 1000, '0x${"a".repeat(40)}', 5, 'TRC20')`);
  } catch (e) {
    mismatchedNetwork = /valid TRC20/i.test(e.message);
  }
  expect(mismatchedNetwork, "withdrawal RPC validates the address against the selected network");

  // The protected USDT ledger is never touched by a conversion.
  const [protectedAfter] = await q(`SELECT usdt_balance FROM wallets WHERE user_id='${u2.id}'`);
  expect(Number(protectedAfter.usdt_balance) === 0, "conversion never debits the protected usdt_balance");

  // ── Arena opponent after a random 20–28 s ────────────────────────────────
  step = "arena window (20–28 s)";
  const [{ join_ludo_queue: q3 }] = await q(`SELECT join_ludo_queue('${u1.id}', 500)`);
  const [q3row] = await q(`SELECT bot_after_secs FROM ludo_queues WHERE id='${q3}'`);
  expect(q3row.bot_after_secs >= 20 && q3row.bot_after_secs <= 28,
         `join_ludo_queue stores a random 20–28 s window (got ${q3row.bot_after_secs})`);

  let [{ match_ludo_queue: m3 }] = await q(`SELECT match_ludo_queue('${q3}', '${u1.id}')`);
  expect(m3.matched === false, "no opponent on the very first poll");

  await q(`UPDATE ludo_queues SET joined_at = now() - interval '19 seconds', bot_after_secs = 20 WHERE id='${q3}'`);
  [{ match_ludo_queue: m3 }] = await q(`SELECT match_ludo_queue('${q3}', '${u1.id}')`);
  expect(m3.matched === false && m3.search_secs === 20,
         `nothing is seated before the 20 s floor (${JSON.stringify(m3)})`);

  await q(`UPDATE ludo_queues SET joined_at = now() - interval '20.5 seconds' WHERE id='${q3}'`);
  [{ match_ludo_queue: m3 }] = await q(`SELECT match_ludo_queue('${q3}', '${u1.id}')`);
  expect(m3.matched === true && m3.match_type === "bot" && m3.opponent_id.startsWith("bot_"),
         `arena opponent seated once the window passes (${m3.opponent_id})`);

  const [botRoom] = await q(`SELECT * FROM ludo_rooms WHERE id='${m3.room_id}'`);
  const arenaName = botRoom.board_state.bot_profile?.name ?? "";
  expect(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(arenaName),
         `arena profile holds a real two-word name (${arenaName} / ${botRoom.board_state.bot_profile?.skill_level})`);
  expect(!arenaName.startsWith("Bot "), "the seated opponent is not named 'Bot …'");
  expect(botRoom.player_1_id === u1.id && botRoom.turn_player_id === u1.id, "human is player_1 in arena rooms");

  // ── Arena opponent can win, and history keeps the real name ──────────────
  await q(`SELECT activate_ludo_room('${botRoom.id}')`);
  const [{ settle_ludo_match: sb }] = await q(`SELECT settle_ludo_match('${botRoom.id}', '${botRoom.player_2_id}', '${u1.id}', 'timeout', 480)`);
  expect(sb === true, "arena opponent can win (settle ok with a bot winner)");
  const bs = (await q(`SELECT * FROM ludo_settlements WHERE room_id='${botRoom.id}'`))[0];
  expect(bs.bot_match === true && bs.winner_id.startsWith("bot_"), "arena win recorded in audit (coins not silently lost)");
  const bh = (await q(`SELECT opponent_name FROM ludo_match_history WHERE room_id='${botRoom.id}' AND user_id='${u1.id}'`))[0];
  expect(bh.opponent_name === arenaName, `match history shows the real opponent name (${bh.opponent_name})`);

  // ── Regression: an all-disabled roster used to dead-end matchmaking ──────
  step = "all-disabled roster self-heals";
  {
    // Exactly the state that broke production: roster hai, par har row inactive.
    await q(`UPDATE ludo_bot_profiles SET active = false`);

    const [{ join_ludo_queue: qh }] = await q(`SELECT join_ludo_queue('${u1.id}', 50)`);
    await q(`UPDATE ludo_queues SET joined_at = now() - interval '30 seconds', bot_after_secs = 21 WHERE id='${qh}'`);
    const [{ match_ludo_queue: mh }] = await q(`SELECT match_ludo_queue('${qh}', '${u1.id}')`);
    expect(mh.matched === true && mh.match_type === "bot",
           `inactive roster no longer dead-ends matchmaking (${JSON.stringify(mh)})`);
    const [healed] = await q(`SELECT count(*) FILTER (WHERE active)::int AS n FROM ludo_bot_profiles`);
    expect(healed.n >= 1, "the RPC re-activated the roster by itself");

    const [healRoom] = await q(`SELECT * FROM ludo_rooms WHERE id='${mh.room_id}'`);
    await q(`SELECT activate_ludo_room('${healRoom.id}')`);
    await q(`SELECT settle_ludo_match('${healRoom.id}', '${u1.id}', '${healRoom.player_2_id}', 'normal', 60)`);
    await q(`UPDATE ludo_bot_profiles SET active = true`);

    const [after] = await q(`SELECT count(*)::int AS total, count(*) FILTER (WHERE active)::int AS active FROM ludo_bot_profiles`);
    expect(after.total === 20 && after.active === 20, "roster is still exactly the 20 arena players");
  }

  // ── Regression: live room → hand it back instead of a unique-index 500 ───
  step = "live room is handed back, not a 500";
  {
    const [{ id: liveId }] = await q(
      `INSERT INTO ludo_rooms (stake, player_1_id, player_2_id, status, board_state, turn_player_id)
       VALUES (50, '${u1.id}', 'bot_livecheck', 'countdown', '{}', '${u1.id}') RETURNING id`);
    const [qRow] = await q(`INSERT INTO ludo_queues (user_id, stake, status, bot_after_secs)
                            VALUES ('${u1.id}', 50, 'waiting', 20) RETURNING id`);
    const [{ match_ludo_queue: ml }] = await q(`SELECT match_ludo_queue('${qRow.id}', '${u1.id}')`);
    expect(ml.matched === true && ml.room_id === liveId,
           `matchmaking hands back the existing live room (${JSON.stringify(ml)})`);
    const [qr] = await q(`SELECT status, room_id FROM ludo_queues WHERE id='${qRow.id}'`);
    expect(qr.status === "matched" && qr.room_id === liveId, "queue row points at that live room");
    await q(`DELETE FROM ludo_rooms  WHERE id='${liveId}'`);
    await q(`DELETE FROM ludo_queues WHERE id='${qRow.id}'`);
  }


  // ── Janitor ──────────────────────────────────────────────────────────────
  step = "ludo_janitor";
  const [{ join_ludo_queue: q4 }] = await q(`SELECT join_ludo_queue('${u2.id}', 50)`);
  await q(`UPDATE ludo_queues SET joined_at = now() - interval '10 minutes', updated_at = now() - interval '10 minutes' WHERE id='${q4}'`);
  const before = (await q(`SELECT coin_balance FROM wallets WHERE user_id='${u2.id}'`))[0].coin_balance;

  // stale countdown room for u1 (u1 has no live room now)
  const [{ id: staleCd }] = await q(`INSERT INTO ludo_rooms (stake, player_1_id, player_2_id, status, board_state, turn_player_id, created_at)
      VALUES (100, '${u1.id}', 'bot_x', 'countdown', '{}', '${u1.id}', now() - interval '10 minutes') RETURNING id`);
  const u1Before = (await q(`SELECT coin_balance FROM wallets WHERE user_id='${u1.id}'`))[0].coin_balance;

  const [{ ludo_janitor: jr }] = await q(`SELECT ludo_janitor()`);
  const after2 = (await q(`SELECT coin_balance FROM wallets WHERE user_id='${u2.id}'`))[0].coin_balance;
  const u1After = (await q(`SELECT coin_balance FROM wallets WHERE user_id='${u1.id}'`))[0].coin_balance;
  const qrow = (await q(`SELECT status FROM ludo_queues WHERE id='${q4}'`))[0];
  const cdrow = (await q(`SELECT status, win_reason FROM ludo_rooms WHERE id='${staleCd}'`))[0];
  expect(jr.queue_refunded === 1 && qrow.status === "cancelled" && after2 === before + 50, `stale queue entry cancelled + refunded (+50) ${JSON.stringify(jr)}`);
  expect(jr.rooms_voided === 1 && cdrow.status === "completed" && cdrow.win_reason === "timeout" && u1After === u1Before + 100,
         "stale countdown room voided + stake refunded (+100)");

  // stale ACTIVE room → settled against player on turn
  const [{ id: staleAct }] = await q(`INSERT INTO ludo_rooms (stake, player_1_id, player_2_id, status, board_state, turn_player_id, match_start_time, created_at, updated_at)
      VALUES (200, '${u1.id}', '${u2.id}', 'active', '{"pieces":{"player_1":[0,0,0,0],"player_2":[0,0,0,0]}}', '${u1.id}',
              now() - interval '20 minutes', now() - interval '20 minutes', now() - interval '20 minutes') RETURNING id`);
  const [{ ludo_janitor: jr2 }] = await q(`SELECT ludo_janitor()`);
  const sa = (await q(`SELECT status, winner_id, loser_id, win_reason FROM ludo_rooms WHERE id='${staleAct}'`))[0];
  expect(jr2.rooms_settled === 1 && sa.status === "completed" && sa.loser_id === u1.id && sa.winner_id === u2.id && sa.win_reason === "timeout",
         "abandoned active room settled: player on turn loses by timeout");

  const [{ ludo_janitor: jr3 }] = await q(`SELECT ludo_janitor()`);
  expect(jr3.queue_refunded === 0 && jr3.rooms_voided === 0 && jr3.rooms_settled === 0, "janitor is a no-op when nothing is stale");

  // ── Privileges ───────────────────────────────────────────────────────────
  step = "privileges";
  const priv = (await q(`SELECT
      has_function_privilege('anon','public.settle_ludo_match(uuid,text,text,text,integer)','EXECUTE') AS anon_settle,
      has_function_privilege('authenticated','public.join_ludo_queue(uuid,integer)','EXECUTE') AS auth_join,
      has_function_privilege('service_role','public.match_ludo_queue(uuid,uuid)','EXECUTE') AS svc_match`))[0];
  expect(priv.anon_settle === false && priv.auth_join === false && priv.svc_match === true,
         "anon/authenticated locked out of money RPCs; service_role allowed");

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("✅ ALL SQL FLOW CHECKS PASSED on PostgreSQL 16");
  process.exit(0);
})().catch(e => fail(e.message + "\n" + (e.stack || "")));
