#!/usr/bin/env node
/**
 * verify-deposit-navigation.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Regression test for the deposit flow's back-navigation contract.
 *
 * NOTE: this is a handler/wiring test (static source contract + invariants),
 * NOT a browser or live-payment test. Real Telegram auth and payment
 * settlement still require the production backend.
 *
 * Contract under test:
 *   1. Deposit step 1 (first screen) ALWAYS shows the back arrow → /home
 *   2. Step 2 (network selection) back → coin selection (step 1)
 *   3. Step 3 back, while no payment exists yet → network selection (step 2)
 *   4. Active payment / in-flight creation → back hidden (flow protection)
 *   5. Shared PageHeader back button has a ≥44px touch target + a11y label
 *   6. Standalone pages (deposit/withdraw/settings/history) center on desktop
 *   7. Payment polling, 40-minute session and terminal-state logic untouched
 *
 * Usage: node scripts/verify-deposit-navigation.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const deposit = read("app/deposit/page.tsx");
const header = read("components/layout/PageHeader.tsx");
const shell = read("components/layout/AppShell.tsx");
const css = read("app/workspace.css");

console.log("deposit: back-navigation contract");
const showBackLine = deposit.split("\n").find((l) => /\bshowBack\b/.test(l) && l.includes("="));
check("showBack flag is defined", Boolean(showBackLine));
check(
  "step 1 (first screen) back is NOT gated away",
  showBackLine ? !/step\s*>\s*1/.test(showBackLine) : false,
  "showBack must not exclude step 1"
);
check("back hidden while an active payment exists", /showBack\s*=\s*[^;\n]*!\s*payment/.test(deposit));
check("back hidden while payment is being created", /showBack\s*=\s*[^;\n]*!\s*submitting/.test(deposit));

console.log("deposit: back destinations");
check("step 1 back navigates to Home (/home)", /step\s*===\s*1\s*\)\s*router\.push\(\s*["']\/home["']\s*\)/.test(deposit));
check("step 2 back returns to coin selection (step 1)", /step\s*===\s*2\s*\)\s*setStep\(1\)/.test(deposit));
check("unpaid step 3 back returns to network selection (step 2)", /step\s*===\s*3\s*&&\s*!\s*payment\s*\)\s*setStep\(2\)/.test(deposit));
check("PageHeader wired with back + onBack", /back=\{showBack\}/.test(deposit) && /onBack=\{handleStepBack\}/.test(deposit));
check("dynamic back label per step", /backLabel=\{/.test(deposit));

console.log("shared header: back-button ergonomics");
check("44px touch target (w-11 h-11 = 44px)", /w-11\s+h-11/.test(header));
check("accessible label on back control", /aria-label=\{backLabel\}/.test(header) && /backLabel\s*=\s*["']Go back["']/.test(header));

console.log("layout: standalone desktop centering");
check("AppShell flags the standalone shell", /app-workspace-standalone/.test(shell));
check(
  "sidebar gutter removed for standalone pages",
  /\.app-workspace\.app-workspace-standalone\s*\{[^}]*padding-left:\s*0/.test(css)
);
check(
  "standalone content centered, max 760px",
  /\.workspace-content\.workspace-standalone\s*\{[^}]*max-width:\s*760px;[^}]*margin:\s*0 auto/.test(css)
);

console.log("economy: $3 deposit floor, unchanged Coin rate");
const economy = read("lib/economy.ts");
const createApi = read("app/api/deposits/create/route.ts");
const migration = read("sql/09_min_deposit_three_usd.sql");
check("rate is still 200 Coins per $1", /COINS_PER_USDT\s*=\s*200\b/.test(economy));
check("100 Coins still equals $0.50", /COINS_PER_HALF_USD\s*=\s*100\b/.test(economy));
check("minimum deposit is $3", /MIN_DEPOSIT_USD\s*=\s*3\b/.test(economy));
check(
  "the floor is derived from the rate (600 Coins), not hard-coded",
  /MIN_DEPOSIT_COINS\s*=\s*MIN_DEPOSIT_USD\s*\*\s*COINS_PER_USDT/.test(economy)
);
check("deposit page uses the shared floor, not a literal", /MIN_COINS\s*=\s*MIN_DEPOSIT_COINS/.test(deposit));
check("deposit page no longer allows a 100-Coin minimum", !/MIN_COINS\s*=\s*100\b/.test(deposit));
check("create API validates through isValidDepositCoinAmount", /isValidDepositCoinAmount\(coinAmount\)/.test(createApi));
check("create API dropped the old 100-Coin literal bound", !/coinAmount\s*<\s*100\b/.test(createApi));
check("SQL migration pins min_deposit to 3.00", /'min_deposit'.*|min_deposit/.test(migration) && /'3\.00'/.test(migration));
check("SQL migration keeps coin_rate at 200", /'coin_rate'/.test(migration) && /'200'/.test(migration));
check("SQL migration guards the deposits table", /deposits_min_coin_amount/.test(migration));

console.log("payment invariants (logic untouched)");
check("5-second status polling retained", /setInterval\(\s*\(\)\s*=>\s*pollStatus\(pid\),\s*5000\s*\)/.test(deposit));
check("40-minute session window retained", /SESSION_SECONDS\s*=\s*40\s*\*\s*60/.test(deposit));
check("terminal-state set retained", /new Set<PaymentStatus>\(\[\s*"finished"\s*,\s*"failed"\s*,\s*"expired"\s*\]\)/.test(deposit));
check("payment create API unchanged", /fetch\(["']\/api\/deposits\/create["']/.test(deposit));
check("status poll API unchanged", /fetch\(\s*`\/api\/deposits\/status\/\$\{pid\}`/.test(deposit));

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll deposit navigation checks passed.");
