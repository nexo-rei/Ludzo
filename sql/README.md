# Ludzo — Supabase SQL

Supabase Dashboard → **SQL Editor** → naya query → file ka poora content paste → **Run**.
Files ko **number order** me chalao. Har file **idempotent** hai — galti se dobara run ho jaye to bhi kuch tootega nahi.

| # | File | Kab chalana hai | Run ke baad |
|---|------|-----------------|-------------|
| 1 | `01_ludo_schema.sql` | Sirf tab jab `ludo_*` tables pehle se **nahi** hain (fresh DB). Pehle se hain to skip karo — ye wahi purani `ludo_schema.sql` hai. | Rakho |
| 2 | `02_ludo_fixes.sql` | **Zaroor chalao.** Missing RPCs (`match_ludo_queue`, `activate_ludo_room`, `advance_ludo_turn`, `append_ludo_reaction`), missing columns (`match_start_time`, `consecutive_sixes`), queue race lock, bot seed dedupe, settle idempotency. Iske bina game **start hi nahi hota**. | Rakho |
| 3 | `03_ludo_cron.sql` | **Zaroor chalao.** Phase hue rooms / queue entries ko auto-clean + refund karta hai (`pg_cron`, har minute). | Rakho |
| 4 | `04_ludo_two_tokens_cleanup.sql` | ✅ **NAYA — ye chalao** | Naye rooms 2-token bante hain; stuck queue rows refund + stale rooms settle (janitor one-shot); pg_cron job ensure. Dobara chalao toh bhi safe. |
| 5 | `05_support_and_task_verification.sql` | Support tickets + task join-verification (bot ko channel/group me admin banana zaroori hai). | Rakho |
| 6 | `06_admin_tasks_withdrawals.sql` | **Zaroor chalao** agar admin panel me task delete ya withdrawal approve/reject fail ho raha hai. user_tasks CASCADE, withdrawals status (`pending/approved/rejected/paid`), `credit_usdt`/`debit_usdt`/`credit_coins` with `p_reason`. | Rakho |
| 7 | `07_arena_players.sql` | ✅ **NAYA — ye chalao.** Display Profiles feature hata deta hai (table bhi DROP), purane `Bot …` profiles delete karke **20 real-naam arena players (5 ladkiyan + 15 ladke)** seed karta hai, aur matchmaking fix karta hai: real opponent na mile to **20–28 second ke beech random** time pe arena opponent seat leta hai (pehle 20 s fix tha, aur sab bots inactive hone ki wajah se match hi nahi lagta tha). | Rakho |
| 8 | `08_coin_economy_and_won_withdrawals.sql` | **Zaroor chalao.** Fixed rate 100 Coins = $0.50, playable-vs-won ledgers, 1,000 Won Coins ($5) minimum and atomic Won-Coin-only withdrawal conversion. | Rakho |
| 9 | `99_verify.sql` | Optional. Read-only check — batata hai ki sab RPC/column install ho gaye ya nahi. | Delete kar sakte ho |

## Display Profiles

Admin panel ka **Display Profiles** page hata diya gaya hai (page, API, leaderboard merge — sab).
Uske rows sirf leaderboard pe extra naam dikhate the, game me kuch nahi karte the. Isliye `07_arena_players.sql`
`ludo_display_profiles` table ko DROP kar deta hai. Opponents ab **arena roster** se aate hain (wahi file seed karti hai).

## Kya delete karna hai?

- `sql/temp/` folder ke andar jo bhi hai wo **one-time** scripts hain — run karke delete kar do.
- `sql/0x_*.sql` files repo me rehni chahiye (ye source of truth hain; naya DB banate waqt phir chahiye hongi).

## Order matter karta hai?

Haan. `02` → `03` → `04` → `05` → `06` → `07` → `08` → `99`. `01` sirf fresh DB pe.
`07` ko `04` ke **baad** hi chalana — `04` match_ludo_queue ka 2-token version install karta hai, aur `07` uska final (20–28 s) version likhta hai.

## Kuch galat ho jaye?

Har file `BEGIN; ... COMMIT;` me wrapped hai — beech me error aaya to poora rollback ho jata hai, adha-adhura kuch apply nahi hota.
Error message copy karke bhejo.
