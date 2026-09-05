/**
 * LUDZO — SQL migration verification
 * ============================================================================
 * Applies sql/01 → 02 → 03 → 99 to a REAL PostgreSQL 16 (in-process WASM via
 * PGlite — nothing to install, no Docker), then drives the whole matchmaking →
 * activate → turn-timeout → reactions → settle → bot fallback → janitor flow
 * and asserts wallets/history/stats line up.
 *
 *     npx -y -p @electric-sql/pglite@0.2.17 node scripts/verify-ludo-sql.js
 *
 * Exit 0 = every check passed. Exit 1 = first failing check is printed.
 */
const fs   = require("fs");
const path = require("path");

// Resolve PGlite from wherever it was installed (npx -p, local node_modules, or a global).
let PGlite;
try {
  ({ PGlite } = require("@electric-sql/pglite"));
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
  updated_at timestamptz DEFAULT now()
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
  expect(JSON.stringify(room.board_state.pieces.player_1) === "[0,0,0,0]", "board_state.pieces seeded");
  expect(room.turn_player_id === u1.id, "turn_player_id set");

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

  // ── Bot match after 20 s ─────────────────────────────────────────────────
  step = "bot fallback";
  const [{ join_ludo_queue: q3 }] = await q(`SELECT join_ludo_queue('${u1.id}', 500)`);
  let [{ match_ludo_queue: m3 }] = await q(`SELECT match_ludo_queue('${q3}', '${u1.id}')`);
  expect(m3.matched === false, "no bot before 20 s");
  await q(`UPDATE ludo_queues SET joined_at = now() - interval '25 seconds' WHERE id='${q3}'`);
  [{ match_ludo_queue: m3 }] = await q(`SELECT match_ludo_queue('${q3}', '${u1.id}')`);
  expect(m3.matched === true && m3.match_type === "bot" && m3.opponent_id.startsWith("bot_"), `bot assigned after 20 s (${m3.opponent_id})`);
  const [botRoom] = await q(`SELECT * FROM ludo_rooms WHERE id='${m3.room_id}'`);
  expect(botRoom.board_state.bot_profile && botRoom.board_state.bot_profile.name.startsWith("Bot "),
         `bot_profile embedded (${botRoom.board_state.bot_profile.name}, ${botRoom.board_state.bot_profile.skill_level})`);
  expect(botRoom.player_1_id === u1.id && botRoom.turn_player_id === u1.id, "human is player_1 in bot rooms");

  await q(`SELECT activate_ludo_room('${botRoom.id}')`);
  const [{ settle_ludo_match: sb }] = await q(`SELECT settle_ludo_match('${botRoom.id}', '${botRoom.player_2_id}', '${u1.id}', 'timeout', 480)`);
  expect(sb === true, "bot can win (settle ok with bot winner)");
  const bs = (await q(`SELECT * FROM ludo_settlements WHERE room_id='${botRoom.id}'`))[0];
  expect(bs.bot_match === true && bs.winner_id.startsWith("bot_"), "bot win recorded in audit (coins not silently lost)");
  const bh = (await q(`SELECT opponent_name FROM ludo_match_history WHERE room_id='${botRoom.id}' AND user_id='${u1.id}'`))[0];
  expect(bh.opponent_name === botRoom.board_state.bot_profile.name, "history shows the real bot name, not 'Ludo Bot'");

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
