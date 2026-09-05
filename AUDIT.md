# LUDZO — Full Project Audit Report

**Repo:** `nexo-rei/Ludzo` · **Commit analysed:** `1e40eef` · **Date:** 2026-09-05
**Method:** pura source padha + `tsc --noEmit` + `next build` + `next lint` chalaya + Ludo engine ko Node me compile karke actual board geometry ke against simulate kiya.

---

## 0. Build status (sabse pehle ye jaan lo)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ PASS (0 type errors) |
| `npx next build` | ✅ PASS (79 routes) |
| `npm run lint` | ❌ **FAIL — exit 1**. Koi ESLint config file hi nahi hai, isliye `next lint` interactive prompt pe atak jaata hai |

> **Matlab:** ye project *compile* ho jaata hai, isliye tumhe lagta hai "code theek hai". Saare bugs **runtime + database + game-logic** level ke hai — build pass hone se wo pakde nahi jaate.

---

## ✅ FIX STATUS (updated 2026-09-05, branch `arena/01a07143-ludzo`)

Legend: ✅ fixed in this branch · 🗄️ fixed, **needs SQL run** (`sql/02_ludo_fixes.sql` + `sql/03_ludo_cron.sql`) · ⏳ not yet

| ID | Issue | Status | Where |
|---|---|---|---|
| B1 | Missing RPCs `match_ludo_queue` / `activate_ludo_room` / `advance_ludo_turn` | 🗄️ | `sql/02_ludo_fixes.sql` §4–6 (+ `append_ludo_reaction` §7). State route also has a CAS fallback so activation works even before the SQL lands |
| B2 | Missing columns `match_start_time`, `consecutive_sixes` | 🗄️ | `sql/02_ludo_fixes.sql` §1 |
| B3 | Bot turn never resets `turn_start_at` | ✅ | `state/route.ts` §4 — `passToHuman()` sets `turnStartMs = now` on every hand-over |
| B4 | No cron → stuck rooms / queue escrow never refunded | 🗄️ | `sql/03_ludo_cron.sql` — `ludo_janitor()` every minute via pg_cron |
| C2 | SECURITY DEFINER RPCs callable by anon/authenticated | 🗄️ | `sql/02_ludo_fixes.sql` §10 — `REVOKE … FROM anon, authenticated; GRANT … TO service_role`; `SET search_path = public` |
| C3 | Queue double-stake race | 🗄️ | `sql/02_ludo_fixes.sql` §2 — partial unique index + refund of existing dupes; `join_ludo_queue` blocks while a live room exists |
| C4 | Abandoned queue refund | 🗄️ | `ludo_janitor()` §A |
| C5 | Settle: no audit, bot wins destroy coins, weak idempotency | 🗄️ | `settle_ludo_match` rewritten — seat validation, row lock, `ludo_settlements` audit row (fee + bot pool), real bot name in history |
| G1 | Track offset off-by-one (0/26 → 1/27) | ✅ | `lib/ludo-engine.ts` `toAbsTrack` + client `pieceXY` — both changed together; 56-check suite proves spawn = launch cell, launch is safe, home-entry adjacent |
| G2 | `applyMove` ignores blocks + double-capture | ✅ | `applyMove` now returns `illegal` for barrier cross/land; move route → 400 |
| G3 | `canAdvance` vs clamp contradiction | ✅ | overshoot is rejected, never clamped |
| G4 | Timer tie always player_1 | ✅ | `decideTimerWinner()` — finished → hearts → score → coin flip; `activate_ludo_room` also randomises first move |
| G5 | 18 s server vs 15 s client bar | ✅ | client `TURN_TIMEOUT_SECS = 18` |
| G7 | No CAS on roll/move | ✅ | `.eq("turn_player_id").eq("dice_rolled").eq("last_roll")` on every update; client resyncs on 409 |
| **NEW** | **Safe-cell barrier soft-lock** (found by fuzzer): 2 pieces parked on the opponent's launch square blocked their yard forever | ✅ | `getBlockedAbsCells` never treats a safe cell as a barrier |
| U1 | Duplicate dead game in `app/games/page.tsx` (+ `showStakes` collision) | ✅ | lobby rewritten, 1281 → ~430 lines, single game screen |
| U2 | `/support-disputes` 404 | ✅ | file → `app/support-disputes/page.tsx` |
| U3 | `/matches` reads localStorage | ✅ | now reads `/api/ludo/stats` like `/games/matches` |
| U4 | GG / Cry emotes invisible | ✅ | SVGs added + fallback glyph for unknown types |
| U5 | `confirm()` in Telegram WebView | ✅ | in-app forfeit modal |
| — | Reaction RMW race | 🗄️ | `append_ludo_reaction` RPC (route falls back to RMW until SQL is run) |
| — | Overlapping polls / frozen board after backgrounding | ✅ | poll mutex + `visibilitychange` resync |
| C1 | `requireAuth` trusts bare header | ⏳ | next PR (needs Telegram initData → signed session) |
| C6–C11 | admin hash, middleware, webhook secret, next CVE, initData replay, localStorage wallet | ⏳ | next PR |
| G6 | Bot only moves when human polls; `skill_level` unused | ⏳ | janitor settles abandoned bot rooms; true server-driven bot ticks = next PR |

**Verify locally:** `npm run verify` (engine: 56 checks · SQL: full flow on real PostgreSQL 16 via PGlite, no install needed).

---

## SEVERITY LEGEND

- 🔴 **S0 — BLOCKER**: iske wajah se game chalega hi nahi / paisa atka hai
- 🟠 **S1 — CRITICAL**: security ya real-money loss
- 🟡 **S2 — MAJOR**: game galat khelta hai (rules/behaviour wrong)
- 🔵 **S3 — MINOR**: UI/UX ya dead code
- ⚪ **S4 — HYGIENE**: cleanup

---

# 🔴 S0 — BLOCKERS (game abhi 100% dead hai)

### B1. 3 RPC functions database me exist hi nahi karte

`ludo_schema.sql` me sirf **4** functions define hai:
`join_ludo_queue`, `cancel_ludo_queue`, `settle_ludo_match`, `update_ludo_stats`.

Lekin code **7** ludo-RPC call karta hai. Ye 3 kahin定义 nahi hai:

| Missing RPC | Called from | Kya hota hai |
|---|---|---|
| `match_ludo_queue(p_queue_id, p_user_id)` | `app/api/ludo/queue/join/route.ts:56,83`<br>`app/api/ludo/queue/status/route.ts:25` | **Matchmaking kabhi hota hi nahi.** Queue join hoke "searching…" pe forever atak jaata hai. Room banta hi nahi. Error: `PGRST202 / Could not find the function public.match_ludo_queue` |
| `activate_ludo_room(p_room_id)` | `app/api/ludo/room/state/route.ts:82` | **Room `countdown` se `active` me kabhi nahi jaata** → Roll button hamesha disabled (client me `room.status === "active"` check hai, `app/games/game/[roomId]/page.tsx:1198`) |
| `advance_ludo_turn(...)` | `app/api/ludo/room/state/route.ts:125` | Timeout pe turn advance karne wali atomic RPC gayab. Code me CAS fallback hai isliye ye "silently" chalta hai, par har timeout pe error log spam hota hai |

Iske alawa **poora base schema hi repo me nahi hai**. README (line ~95) kehta hai:

```
├── sql/
│   ├── schema.sql      # All table definitions
│   ├── functions.sql   # credit_usdt, debit_usdt, get_leaderboard, etc.
│   ├── policies.sql
│   └── seed.sql
```

**`sql/` folder GitHub pe exist hi nahi karta.** Sirf `ludo_schema.sql` hai. To ye sab cheezein repo se gayab hai (tumne manually Supabase me banayi hongi):

- Tables: `users`, `wallets`, `transactions`, `deposits`, `withdrawals`, `tasks`, `user_tasks`, `referrals`, `daily_streaks`, `ad_logs`, `announcements`, `settings`, `admin_users`, `admin_logs`, `user_preferences`
- Functions: `credit_coins`, `debit_coins`, `credit_usdt`, `debit_usdt`, `get_leaderboard`, `get_user_rank`

**➡️ Action:** mujhe apni chalayi hui SQL files do, main inko repo me `sql/` ke roop me daal ke ek single idempotent migration bana dunga.

---

### B2. `ludo_rooms` ke 2 columns schema me nahi hai

Code in columns ko directly read karta hai:

| Column | Used at |
|---|---|
| `match_start_time` | `state/route.ts:72,86,374` · `move/route.ts:93` · `forfeit/route.ts:23,45` |
| `consecutive_sixes` | `state/route.ts:68` · `move/route.ts:143` · `roll/route.ts:68` |

`consecutive_sixes` ke liye code me defensive guard hai (`if ("consecutive_sixes" in room)`) — par **`match_start_time` ke liye koi guard nahi**, aur do jagah wo explicitly `SELECT` list me hai:

```ts
// app/api/ludo/room/forfeit/route.ts:23
.select("id, status, player_1_id, player_2_id, created_at, match_start_time")
// app/api/ludo/room/state/route.ts:86
.select("status, match_start_time, turn_start_at")
```

Agar column DB me nahi hai → Postgres error **`42703 column ludo_rooms.match_start_time does not exist`** → forfeit 500 deta hai aur state route ka activation re-read fail hota hai (room countdown me hi reh jaata hai).

**Fix:**
```sql
ALTER TABLE ludo_rooms
  ADD COLUMN IF NOT EXISTS match_start_time  timestamptz,
  ADD COLUMN IF NOT EXISTS consecutive_sixes integer NOT NULL DEFAULT 0
      CHECK (consecutive_sixes >= 0);
```

---

### B3. Bot ka turn khatam hone pe `turn_start_at` reset nahi hota → human ka turn pehle hi "expired"

`app/api/ludo/room/state/route.ts` me bot-turn block (lines **210–283**) `turnPlayerId`, `diceRolled`, `lastRoll`, `movablePieces`, `boardState`, scores — sab update karta hai, **par `turnStartMs` kabhi reassign nahi karta**. Maine grep karke verify kiya: bot block ke andar `turnStartMs` ka ek bhi assignment nahi hai.

Phir line **314** persist karte waqt:
```ts
turn_start_at: new Date(turnStartMs).toISOString(),   // ← purana (bot ke turn ka) timestamp wapas likh diya
```

**Natija:** bot ne ~3.7s liye, turn human ko mila, lekin DB me `turn_start_at` wahi purana hai. Human ko 18s ki jagah **~14s** milte hai. Line 358 ka `turn_remaining_seconds` bhi wahi galat value bhejta hai.

Aur bura: agar user ne app background kar diya (Telegram WebView me `setInterval` throttle ho jaata hai) ya network slow tha, to wapas aane pe human ka turn **already 18s+ expired** hota hai → turant:
- 1 heart kat jaata hai (line 106/112)
- turn wapas bot ko chala jaata hai
- ye loop 3 baar chalta hai → **`win_reason = 'timeout'` se human haar jaata hai, bina khel ke**

**Fix (bot block me, teeno jagah jahan turn human ko pass hota hai — lines 227, 235, 271):**
```ts
if (!extraTurn) {
  turnPlayerId = String(room.player_1_id);
  consecutiveSixes = 0;
  turnStartMs = now;          // ← YE LINE ADD KARO
}
// aur triple-six / no-moves auto-pass branches me bhi: turnStartMs = now;
```

---

### B4. Koi background worker / cron nahi hai → atke hue rooms ka paisa kabhi wapas nahi aata

Poora game **client polling** pe chalta hai (`/api/ludo/room/state` har 1.2s). Server pe koi scheduled job nahi hai. To:

- Dono players ne app band kar di → room `status='active'` me **hamesha ke liye** pada rahega, dono ka stake escrow me atka
- Queue me `waiting` entry + coins deducted, par kabhi match nahi mila aur user ne cancel nahi kiya → **coins gayab**, koi refund nahi
- `player_1_status` / `player_2_status` columns schema me hai par **code me kahin use hi nahi hote** (disconnect detection dead feature hai)

**Fix:** Supabase `pg_cron` + ek `sweep_stale_ludo()` function (5 min me ek baar), ya ek Vercel/Cloudflare cron jo `/api/ludo/cron/sweep` hit kare.

---

# 🟠 S1 — CRITICAL (security + real money)

### C1. `requireAuth` authentication karta hi nahi — sirf header pe bharosa

`lib/auth.ts:12-39`:
```ts
const authHeader = req.headers.get("authorization");   // "Bearer <userId>"
const xUserId    = req.headers.get("x-user-id");
...
if (!userId || userId.length < 10) return { ok: false };
return { ok: true, userId };                            // ← koi signature verify nahi!
```

`userId` = seedha `users.id` UUID. Aur `/api/auth/telegram` (line 272) poora `user` row client ko **return kar deta hai**, jo `localStorage.ludzo_user` me store hota hai.

**Exploit (koi bhi, browser console se):**
```js
fetch('/api/wallet',        { headers:{ 'x-user-id': VICTIM_UUID }})   // kisi ka bhi balance dekho
fetch('/api/ludo/queue/join',{ method:'POST', headers:{'x-user-id':VICTIM_UUID,'content-type':'application/json'}, body:'{"stake":5000}'})
fetch('/api/withdrawals/create', ...)                                   // kisi ka bhi withdrawal
```
Sab routes `createAdminClient()` (**service-role key**) use karte hai, matlab RLS bhi bypass. Ye **full account takeover** hai — 34 API endpoints pe.

Aur `/api/admin/*` routes ko `middleware.ts` explicitly `NextResponse.next()` se pass karta hai.

**Fix:** Telegram auth pe ek signed session token (JWT via `jose`, jo already dependency hai) issue karo, `httpOnly` cookie me daalo, aur `requireAuth` me `jwtVerify` karo. `userId` kabhi client-supplied mat maano.

---

### C2. `SECURITY DEFINER` RPCs me `p_user_id` parameter hai + koi `auth.uid()` check nahi

`ludo_schema.sql` me:

```sql
CREATE OR REPLACE FUNCTION public.join_ludo_queue(p_user_id uuid, p_stake integer)
  ... SECURITY DEFINER ...
      UPDATE wallets SET coin_balance = coin_balance - p_stake WHERE user_id = p_user_id;
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` browser bundle me **public** hai. Default Postgres me `EXECUTE` privilege `PUBLIC` ko milta hai, aur is file me **kahin `REVOKE` nahi hai**. To:

```js
// koi bhi anon key se, kisi ka bhi wallet khali kar sakta hai:
supabase.rpc('join_ludo_queue', { p_user_id: VICTIM, p_stake: 5000 })
supabase.rpc('cancel_ludo_queue', { p_queue_id: X, p_user_id: VICTIM })

// aur khud ko winner declare karke reward le sakta hai:
supabase.rpc('settle_ludo_match', {
  p_room_id: ANY_ROOM, p_winner_id: ME, p_loser_id: VICTIM,
  p_win_reason: 'normal', p_duration: 1 })
```

`settle_ludo_match` me **koi check nahi** ki `p_winner_id`/`p_loser_id` actually us room ke players hai. Ye seedha `won_coins_balance` me paisa daalta hai.

**Fix (har RPC me):**
```sql
CREATE OR REPLACE FUNCTION public.join_ludo_queue(p_stake integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public            -- ← search_path pin (Supabase advisor warning bhi fix)
AS $$
DECLARE v_user uuid := auth.uid();  -- ← parameter hatao, khud nikalo
...
$$;
REVOKE ALL ON FUNCTION public.join_ludo_queue(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_ludo_queue(integer) TO authenticated;
```
`settle_ludo_match` ko **sirf service-role** se callable rakho:
```sql
REVOKE ALL ON FUNCTION public.settle_ludo_match(uuid,text,text,text,integer) FROM PUBLIC, anon, authenticated;
```

---

### C3. `join_ludo_queue` me race condition → ek hi user se double stake deduct

```sql
SELECT COUNT(*) INTO v_already FROM ludo_queues
 WHERE user_id=p_user_id AND stake=p_stake AND status='waiting';
IF v_already > 0 THEN RAISE EXCEPTION ...
INSERT INTO ludo_queues ...
```

Check-then-insert hai, koi lock/unique constraint nahi. Do concurrent requests (double-tap, ya 2 devices) dono `COUNT=0` dekhenge → **dono stake deduct + 2 queue entries**.

`app/api/ludo/queue/join/route.ts:44-50` ka TS-level check bhi same non-atomic pattern hai.

**Fix:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_ludo_queues_one_waiting_per_user
  ON ludo_queues (user_id) WHERE status = 'waiting';
```
+ RPC me `INSERT ... ON CONFLICT DO NOTHING` aur conflict pe exception.

---

### C4. Abandoned queue entries ka koi refund nahi

Stake **queue join ke waqt hi deduct** ho jaata hai. Agar match kabhi nahi mila aur user ne app band kar diya → `status='waiting'` entry forever, coins lock. Koi expiry/cleanup nahi (B4 se related).

Aur `settle_ludo_match` queue rows ko `matched` status pe hi chhod deta hai — kabhi close nahi karta. `ludo_queues` me matched/expired entries ka dher lag jaayega.

---

### C5. `settle_ludo_match` economy leak karta hai

1. **Bot jeeta** → `p_winner_id LIKE 'bot_%'` → `v_winner_uuid = NULL` → **koi reward credit hi nahi hota**. Loser ka stake deduct ho chuka hai, winner ko kuch nahi mila → coins economy se **gayab** (deflation). 2% platform fee ka koi ledger record bhi nahi.
2. **`transactions` table me koi entry nahi** hoti — stake deduction aur reward, dono. To `/api/wallet/history` me game ke paise dikhte hi nahi. User ko lagega paisa chori ho gaya.
3. **Idempotency weak:** guard sirf `status NOT IN ('completed','forfeited')` pe hai. `FOR UPDATE` row tabhi lock hota hai jab row match kare — do concurrent calls me se ek `NOT FOUND` pe `return false` karega, theek hai, par move-route + state-route dono se settle call ho sakta hai (client jeetne ke baad dono poll karte hai) → double history rows ka risk.
4. `ludo_stats.win_rate` **TEXT** (`'67%'`) me store hoti hai → leaderboard pe sort karna impossible/wrong. Numeric column + generated display hona chahiye.

---

### C6. Admin auth: plain SHA-256, hashes console me log, no rate limit

`app/api/admin/auth/route.ts`:
```ts
// Verify password (bcrypt comparison)      ← comment jhooth bolta hai
const hash = createHash("sha256").update(password).digest("hex");
console.log("INPUT_HASH:", hash);
console.log("DB_HASH:", admin?.password_hash);
console.log("ALL_ADMINS:", JSON.stringify(allAdmins));
```
- Salt-less SHA-256 → rainbow table se turant crack
- Password hash **server logs me print** ho raha hai
- Koi rate-limiting / lockout nahi → unlimited brute force
- README me default creds public likhe hai: `admin / ludzo_admin_2024`
- `lib/auth.ts:51` → `JWT_SECRET` ka **hardcoded fallback**: `"ludzo_dev_secret_min_32_chars_long"`. Env var missing hua to koi bhi admin JWT forge kar sakta hai.

---

### C7. `middleware.ts` poora no-op hai

```ts
const PUBLIC_PATHS = ["/", "/language", ...];
if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
```
`"/"` list me hai aur **har** pathname `"/"` se start hota hai → ye branch hamesha true → middleware kabhi kuch block nahi karta. Baaki 3 branches bhi `NextResponse.next()` hi return karte hai.

README kehta hai `middleware.ts # Maintenance mode redirect` — **maintenance mode enforce nahi hota**. Aur `app/maintenance/` page bhi exist nahi karta (jabki `/maintenance` PUBLIC_PATHS me listed hai).

---

### C8. Telegram bot webhook pe koi secret verification nahi

`app/api/bot/webhook/route.ts` — `X-Telegram-Bot-Api-Secret-Token` check nahi hai. Koi bhi POST karke tumhare bot se kisi bhi `chat_id` pe message bhejwa sakta hai (spam / ban risk).

Saath me `handleStart()` webhook ke andar **~2.6s sleep** karta hai (4 loader frames × 700ms + 500ms). Telegram itna wait nahi karta → update retry hota hai → **duplicate /start messages**.

Aur `app/api/auth/telegram/route.ts:68` me bot-command handler **`GET`** pe export kiya gaya hai — Telegram webhook hamesha POST bhejta hai, to wo 100% dead code hai (duplicate of `app/api/bot/webhook`).

---

### C9. `next@15.1.0` pe known CVE

`npm install` khud warn karta hai:
```
npm warn deprecated next@15.1.0: This version has a security vulnerability.
Please upgrade to a patched version. See https://nextjs.org/blog/CVE-2025-66478
```
Next 15.1.x me middleware-auth-bypass CVEs bhi hai. **15.5+ pe upgrade karo.**

---

### C10. Telegram `initData` replay ho sakta hai

`lib/telegram.ts:12-41` signature to verify karta hai (good), par:
- **`auth_date` freshness check nahi** → ek baar capture kiya gaya `initData` string **hamesha ke liye** valid hai. Kisi ka bhi session replay ho sakta hai.
- `expectedHash !== hash` — timing-safe compare nahi (`crypto.timingSafeEqual` use karo)
- Binance webhook (`verifyBinanceWebhook`) me bhi timestamp tolerance nahi → replay

---

### C11. Client-side wallet override (fake balances)

`hooks/useApp.tsx:110-118`:
```ts
const storedCoinsOverride = localStorage.getItem("ludzo_wallet_coins_override");
if (storedCoinsOverride !== null) finalWallet.coin_balance = Number(storedCoinsOverride);
```
Aur `recordMatchResult()` (line 205, paisa line 249 pe) **hardcoded demo math** karta hai:
```ts
if (isWin) updateWalletBalances(100, 0, 50);   // entry fee 50 maan ke, 100 credit
```
Ye poora demo/prototype code production me reh gaya. User apna balance khud DevTools se set kar sakta hai (display level pe), aur `gamingStats` / `matchHistory` DB ki jagah localStorage se aate hai. Real stake amounts (50…5000) ke saath ye math bilkul galat hai.

---

# 🟡 S2 — GAME LOGIC (Ludo rules galat hai)

Maine `lib/ludo-engine.ts` ko compile karke client ke actual 52-cell `TRACK` array ke against simulate kiya. Ye **proved** results hai:

### G1. 🔴 Track offset **off-by-one** — board art aur engine aapas me match nahi karte

Client board (`app/games/page.tsx:12-65`) explicitly comment karta hai:
```
{ x: 1, y: 6 },  // 1  (Red Launch)
{ x: 8, y: 1 },  // 14 (Green Launch)
{ x: 13, y: 8 }, // 27 (Blue Launch)
{ x: 6, y: 13 }, // 40 (Yellow Launch)
```
Aur game screen launch cells ko **idx 1 aur idx 27** pe highlight karta hai (`page.tsx:352-353`: `isLaunchRed = idx === 1`, `isLaunchBlue = idx === 27`).

Lekin engine (`lib/ludo-engine.ts:43-47`):
```ts
export function toAbsTrack(relPos: number, isPlayer1: boolean): number | null {
  const offset = isPlayer1 ? 0 : 26;          // ← 1 aur 27 hona chahiye
  return (relPos - 1 + offset) % 52;
}
```

Simulation output:
```
board art launch = idx 1 (1,6) | idx 27 (13,8)
engine spawn     = idx 0 (0,6) | idx 26 (14,8)     ← OFF BY ONE
```

**Iske 3 visible symptoms:**

| # | Symptom |
|---|---|
| a | **Piece galat cell pe spawn hota hai** — jahan coloured "launch" square draw hai wahan piece nahi, ek cell peeche dikhta hai |
| b | **Start square safe nahi hai!** `SAFE_TRACK_INDICES = {1,9,14,22,27,35,40,48}` — engine ka spawn cell `0` aur `26` is set me **nahi** hai. Prove: `isSafeCell(0) === false`, `isSafeCell(26) === false`. Matlab **opponent tumhara piece tumhare khud ke start square pe kaat sakta hai** — jo Ludo me kabhi nahi hota. Aur jahan star ★ draw hai wahan actually koi piece rukta hi nahi |
| c | **Home-lane entry cell skip** → token diagonally teleport karta hai. Prove: `P1 walks 51/52 cells, never steps on idx 51 (0,7)` aur `P2 never steps on idx 25 (14,7)`. Token `(0,8)` se seedha `(1,7)` pe koodta hai, aur `(14,6)` se `(13,7)` pe |

**Fix — ek hi line se teeno problem solve:**
```ts
// lib/ludo-engine.ts
const offset = isPlayer1 ? 1 : 27;
```
Verify (maine chalaya):
```
P1 spawn rel1 -> abs 1  = (1,6)   == drawn launch idx 1   ✓ MATCH
P2 spawn rel1 -> abs 27 = (13,8)  == drawn launch idx 27  ✓ MATCH
P1 last shared rel51 -> abs 51 = (0,7)  -> home lane (1,7)  ✓ ADJACENT
P2 last shared rel51 -> abs 25 = (14,7) -> home lane (13,7) ✓ ADJACENT
safe set covers both spawns: true ✓
P1 skips only idx 0  (= cell just before its own start) ✓
P2 skips only idx 26 (= cell just before its own start) ✓
```

**Same fix client me bhi chahiye** — `app/games/game/[roomId]/page.tsx:289-292`:
```ts
const trackIdx = isP1 ? (pos - 1) % TRACK.length          // ← (pos) % 52
                      : (pos - 1 + 26) % TRACK.length;    // ← (pos + 26) % 52
```
Server aur client dono ko **ek saath** change karna, warna desync ho jaayega. (Aur purane rooms ka `board_state` migrate karna padega.)

---

### G2. `applyMove()` block rule ko maanta hi nahi + double-capture karta hai

Doc comment kehta hai *"An opponent piece may neither land on nor pass over that cell"* — par ye check **sirf `calcMovablePieces()` (roll time) me hai**, `applyMove()` (move time) me bilkul nahi.

Prove:
```
P2 pieces [6,6,0,0] -> block at abs idx31 (9,8)
calcMovablePieces([27,0,0,0], roll=5) -> []            ✓ correctly blocked
applyMove([27,0,0,0], [6,6,0,0], 0, 5, true)
   -> myPieces [32,0,0,0], oppPieces [0,0,0,0], captured: true    ✗ BLOCK TOD DIYA + DONO PIECE KHA GAYA
```
Do problems: (1) block bypass ho jaata hai agar `movable_pieces` DB me stale ho (state-route poll aur move-route ke beech race), (2) ek block pe land karne se **dono** pieces capture ho jaate hai — jabki block by-definition immune hona chahiye.

**Fix:** `applyMove()` ke andar bhi `pathCrossesBlock()` verify karo, aur agar destination pe ≥2 opponent pieces ho to capture mat karo.

---

### G3. `canAdvance()` aur `applyMove()` aapas me contradict karte hai

```ts
canAdvance(55, 4) === false                       // 55+4=59 > 57 → exact roll chahiye
applyMove([55,0,0,0], [...], 0, 4, true).myPieces // → [57,0,0,0]  ← CLAMP karke FINISH de diya!
```
`applyMove` me `Math.min(currPos + roll, 57)` hai. Abhi ye reachable nahi kyunki `calcMovablePieces` gate karta hai — par ye **latent game-winning exploit** hai: koi bhi direct `/api/ludo/room/move` call jisme `movable_pieces` stale ho, extra roll se seedha jeet jaayega. Guard hatao ya `applyMove` me explicit validation daalo.

---

### G4. Timer expiry pe tie hamesha `player_1` jeetta hai

`app/api/ludo/room/state/route.ts:202`:
```ts
if (score1 >= score2) { winnerId = player_1; } else { winnerId = player_2; }
```
`>=` ka matlab **har tie pe player_1 (jo queue me pehle aaya) jeetta hai**. `calcScore` = positions ka sum, to early game me ties bahut common hai. Ye systematic unfairness hai — real money game me nahi chalega.

**Fix:** tiebreak ladder → (1) zyada pieces finished (57 pe), (2) zyada hearts, (3) higher score, (4) **dono ko refund** (draw).

---

### G5. Turn timeout server 18s, client 15s

`lib/ludo-engine.ts:35`: `TURN_TIMEOUT_SECS = 18`
Client (`page.tsx:1096`): `style={{ width: ${(turnSecs / 15) * 100}% }}` aur initial `turnSecs = 15`.

Server `turn_remaining_seconds = 18 - elapsed` bhejta hai → pehle 3 second tak progress bar **120% wide** hoti hai (clip hoti hai), aur timer 18→15 jump karta hai. Player ko lagta hai uske paas 15s hai par actually 18s hai — ya ulta, confuse hota hai.

---

### G6. Bot sirf tab chalta hai jab human poll karta hai

Bot ka roll/move `/api/ludo/room/state` ke GET handler ke andar hai. Iska matlab:
- Human ka poll band (app background) → **bot freeze**
- Bot ki "speed" human ke network pe depend karti hai
- `ludo_bot_profiles.skill_level` (`easy/medium/hard`) column **kahin use nahi hota** — sab bots ek jaise khelte hai
- `botChoosePiece()` sirf "aage badho" heuristic hai: danger avoidance nahi, safe-cell preference nahi, blocking strategy nahi

**Fix:** bot turn ko ek server-side worker/cron me chalao, ya kam se kam `skill_level` ko heuristic weights me map karo.

---

### G7. Roll/Move me koi optimistic-locking (CAS) nahi → double-roll, double-move

`roll/route.ts:23-27` room read karta hai, `room.dice_rolled` check karta hai, phir line 149 pe plain `update` karta hai. Beech me koi atomicity nahi. 2 tabs / 2 devices se ek saath roll → **do rolls**. Same `move/route.ts` me: do concurrent move requests dono pass ho sakte hai.

Client-side `rollInFlightRef` sirf ek browser tab ko rokta hai.

**Fix:**
```ts
const { data } = await supabase.from("ludo_rooms")
  .update(payload)
  .eq("id", room_id)
  .eq("turn_player_id", userId)
  .eq("dice_rolled", false)        // ← CAS
  .select("id").maybeSingle();
if (!data) return NextResponse.json({ success:false, error:"Stale turn" }, { status:409 });
```

---

### G8. Extra-turn rules non-standard + chain risk

`getsExtraTurn(roll, capture, reachedFinish)` → **6 OR capture OR finish** — teeno pe extra turn. Standard Ludo me sirf 6 pe milta hai (capture kuch variants me). Teen conditions OR karne se ek player lambi chain bana sakta hai aur opponent ko ek bhi turn nahi milta. Ye design decision hai — par tumhare `fair-play` page pe jo likha hai usse match karta hai ya nahi, verify karo.

---

### G9. `ludo_room_states` table + uska unique index = dead weight, aur comment jhooth bolta hai

```sql
-- Only keep latest snapshot per room — old ones cleaned by trigger below   ← KOI TRIGGER NAHI HAI
CREATE UNIQUE INDEX idx_ludo_room_states_room ON ludo_room_states (room_id);
```
Poore codebase me `ludo_room_states` ka **ek bhi reference nahi**. Unique index ki wajah se doosra snapshot insert hote hi `23505 duplicate key` aayega. Ya to table hatao, ya upsert (`ON CONFLICT (room_id) DO UPDATE`) use karo.

---

# 🔵 S3 — CLIENT / UI BUGS

### U1. `app/games/page.tsx` = poore game ki **doosri duplicate copy** (1281 lines, dead + buggy)

Lobby page match milne pe `router.push('/games/game/' + room_id)` karta hai (line 194) — to is file ka poora inline game (board, dice, forfeit, reactions, winner overlay, lines ~911–1275) **dead code** hai. Par usme alag bugs bhi hai:

| Bug | Detail |
|---|---|
| Alag track formula | line 535: `const index = isPlayer1 ? (position % 52) : (26 + position) % 52;` — game page aur engine se **teen** alag conventions |
| P2 home path galat | line 531: `{ x: 14 - (position - 51), y: 7 }` → pos 52 → x=11, pos 56 → x=7 (centre column!). Game page `(13,7)…(9,7)` use karta hai |
| `showStakes` state collision | line 948: `onClick={() => setShowStakes(!showStakes)} /* reused toggle */` — **stake-selection popup aur reaction drawer ek hi state share karte hai.** Game ke beech reaction button dabao to **stake picker modal live game ke upar khul jaata hai** (dono line 670 aur line 1195 pe render hote hai) |
| TDZ-fragile | `piece_idx_to_use()` (line 539) `getPieceCoords()` (line 502) ke **baad** define hota hai par uske andar use hota hai |
| Crash risk | line 924: `roomState.player_2_profile.avatar` — koi optional chaining nahi |
| Invalid Tailwind | `bg-radial-gradient` (lines 612, 1240) — Tailwind v3 me ye class exist nahi karti, silently no-op |

**Fix:** is file ko sirf lobby rakho (~350 lines), poora inline game delete karo.

---

### U2. `/support-disputes` route 404 deta hai

`app/support-disputes` ek **FILE** hai (5240 bytes, `"use client"` page component), **folder nahi**. App Router isko route nahi maanta.
Par 2 jagah se link kiya gaya hai:
- `app/legal/page.tsx:71` → `href: "/support-disputes"`
- `app/support/page.tsx:28` → `href: "/support-disputes"`

**Fix:** `mkdir app/support-disputes && git mv app/support-disputes app/support-disputes/page.tsx`

---

### U3. Do alag "Matches" pages, do alag data sources

| Route | Data kahan se | Linked from |
|---|---|---|
| `/matches` (`app/matches/page.tsx`) | **`localStorage.ludzo_match_history`** (fake demo data) | `components/layout/BottomNav.tsx:50` ← **users yahi jaate hai** |
| `/games/matches` (`app/games/matches/page.tsx`) | real `/api/ludo/stats` → `ludo_match_history` | `components/gaming/GamingBottomNav.tsx:10` |

To bottom-nav se "Matches" pe jaane pe user ko **khali ya jhoothi history** dikhti hai. Same duplication `/profile` vs `/games/profile` pe bhi hai.

---

### U4. Reaction types mismatch → invisible reactions

| Source | Allowed |
|---|---|
| `app/api/ludo/room/reaction/route.ts:5` | `Laugh, Angry, Fire, GG, Crown, Shock, Cry, Clap` |
| `app/games/page.tsx:69` (bhejta hai) | `Laugh, Angry, Fire, GG, Crown, Shock, Cry` |
| `EmoteSVG` (`game/[roomId]/page.tsx:103-172`) | **sirf** `Laugh, Angry, Fire, Crown, Clap, Shock` |

`GG` aur `Cry` bheje ja sakte hai, API accept kar leta hai, par `EmoteSVG` `default: return null` → **opponent ko reaction dikhta hi nahi**. Aur `game/[roomId]` page `Clap` bhejta hai jo `games/page.tsx` ki list me nahi.

---

### U5. `confirm()` Telegram WebView me

`game/[roomId]/page.tsx:931` aur `games/page.tsx:451` — `window.confirm()` use kiya gaya hai. Telegram ke in-app WebView (khaas kar iOS) me native dialogs block/ugly hote hai. Custom modal banao.

---

### U6. `/api/ludo/room/reaction` read-modify-write race

Route `chat_reactions` read karke array me push karke poora array wapas likhta hai (line 71-74). Do players ne ek saath react kiya → ek reaction **kho jaayega**. Postgres `jsonb` append ya RPC use karo.

---

### U7. Debug logs production me (80 `console.log`, 159 total `console.*` calls)

| File | Count | Kya leak hota hai |
|---|---|---|
| `app/api/auth/telegram/route.ts` | 21 | `console.log("FULL BODY:", ...)` — poora Telegram initData (signed auth payload!) |
| `app/api/admin/auth/route.ts` | 7 | `INPUT_HASH`, `DB_HASH`, `ALL_ADMINS` |
| `lib/auth.ts` | 3 | `AUTH HEADER`, `X USER ID`, `PARSED USER ID` — **har request pe** |
| `app/api/ludo/room/state/route.ts` | 10 | board state, room ids |

Aur `/api/auth/telegram` error response me **`stack` trace client ko bhejta hai** (line 289-292). Ye sab hatao.

---

### U8. Polling architecture Supabase Realtime ki jagah

Har client har **1.2s** pe `/api/ludo/room/state` hit karta hai — aur wo handler DB **read + write** dono karta hai (bot moves, timeouts, settle). 100 concurrent matches = ~170 req/s + lagbhag utne hi writes. Ye scale nahi karega aur races badhata hai.

**Fix:** Supabase Realtime (`postgres_changes` on `ludo_rooms`) subscribe karo; polling ko 10s fallback banao. Bot/timeout logic ko ek alag server-side worker me le jao.

---

# ⚪ S4 — HYGIENE

| # | Issue |
|---|---|
| H1 | **`.gitignore` file hi nahi hai.** `node_modules/`, `.next/`, `.env.local`, `tsconfig.tsbuildinfo` — sab commit ho sakte hai. (Maine build ke baad `.next`, `.env.local`, `tsconfig.tsbuildinfo`, `package-lock.json` clean kar diye aur `next-env.d.ts` revert kar diya.) |
| H2 | **Koi ESLint config nahi** (`.eslintrc.json`) par `eslint` + `eslint-config-next` devDeps me hai → `npm run lint` exit 1 |
| H3 | `ludo_bot_profiles` seed `ON CONFLICT DO NOTHING` **bina conflict target ke** → migration dobara chalane pe 3 bots **duplicate** insert ho jaate hai (id har baar naya uuid). `UNIQUE(bot_name)` + `ON CONFLICT (bot_name) DO NOTHING` chahiye |
| H4 | `ludo_schema.sql` `REFERENCES users(id)` karta hai par `users` table isi file me nahi banti → fresh DB pe file akeli chalane pe `42P01 relation "users" does not exist` |
| H5 | `ludo_queues.room_id` pe koi FK nahi |
| H6 | `ludo_rooms.player_1_id` = `uuid`, `player_2_id` = `text` — mixed typing. Isliye har jagah `String(room.player_1_id)` aur `auth.uid()::text` casts chahiye padte hai. Dono ko `text` rakho (bot ids ke liye) ya `player_2_id uuid NULL` + alag `is_bot` flag |
| H7 | `ludo_rooms(turn_player_id, status)` pe koi index nahi → timeout sweep / active-room queries sequential scan karengi |
| H8 | README outdated: `games/ # Coming soon page` (ab poora game hai), `sql/` folder (exist nahi karta), `middleware.ts # Maintenance mode redirect` (no-op hai) |
| H9 | README ka deployment section galat: Cloudflare Pages pe `.next` "build output directory" nahi hota — `@cloudflare/next-on-pages` ya OpenNext chahiye. Aur ye app server-side polling + service-role key use karti hai → static hosting pe nahi chalegi |
| H10 | `lib/i18n.ts` me 10 languages hai, par **poore game screens hardcoded English** hai (`"Roll!"`, `"Not your turn"`, `"Captured opponent piece!"`) |
| H11 | `types/index.ts:258` → `wallet: { coin_balance, usdt_balance }` — `won_coins_balance` missing (jabki `Wallet` interface line 46 pe wo rakhta hai) |
| H12 | `app/games/play/page.tsx:19` → Ludo ko `"2-4 Players"` aur `"10-15 min"` batata hai; actual implementation **1v1** aur **8 min** (`MATCH_DURATION_SECS = 480`) hai |
| H13 | `hooks/useTelegram.ts:63-65` → `initData` (signed auth token) console me print |

---

## Fix priority — is order me karo

| Phase | Kaam | Issues |
|---|---|---|
| **1. Game chalao** | 3 missing RPCs likho (`match_ludo_queue`, `activate_ludo_room`, `advance_ludo_turn`) + 2 missing columns add karo | B1, B2 |
| **2. Game sahi chalao** | Track offset `0/26 → 1/27` (engine **+** client, ek saath) · bot turn pe `turnStartMs = now` | G1, B3 |
| **3. Paisa bachao** | RPCs me `auth.uid()` + `REVOKE` + `SET search_path` · unique partial index on queue · `transactions` ledger · stale-room cron | C2, C3, C4, C5, B4 |
| **4. Auth theek karo** | Signed JWT session (header-based userId hatao) · admin bcrypt + rate limit · `JWT_SECRET` fallback hatao · Next upgrade | C1, C6, C9 |
| **5. Rules + races** | `applyMove` block enforcement · roll/move CAS · tie-break refund · timeout 18 vs 15 | G2, G3, G4, G5, G7 |
| **6. Cleanup** | `games/page.tsx` ka duplicate game delete · `/support-disputes` folder banao · `/matches` ko real API pe daalo · `.gitignore` + eslint · logs hatao | U1–U8, H1–H13 |

---

## Mujhe ye chahiye taaki main aage badh saku

1. **Wo saari SQL files/queries jo tumne ab tak Supabase me chalayi hai** — khaas kar:
   - `users`, `wallets`, `transactions` ka `CREATE TABLE`
   - `credit_coins` / `debit_coins` / `credit_usdt` / `debit_usdt`
   - `get_leaderboard` / `get_user_rank`
   - agar tumne `match_ludo_queue` / `activate_ludo_room` / `advance_ludo_turn` khud likhe ho to wo
2. **`docs/db-check.sql`** (is repo me maine bana diya hai) Supabase SQL editor me chalao aur output paste karo — wo exactly bata dega ki DB me kya missing hai aur kahan paisa atka hai
3. Actual **error messages / screenshots** jo tumhe game khelte waqt dikhte hai
