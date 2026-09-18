#!/usr/bin/env node
/**
 * verify-ui-fixes.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Regression test for the three Telegram mini-app UI defects reported by players:
 *
 *   1. Leaderboard visual language  → must be workspace tokens (no hard-coded
 *      gold/slate/blue palette, no white text that disappears in light mode), and
 *      rows 4+ must show the account NAME only, never "@username".
 *   2. Stake "Match confirmation"   → must render through <Sheet>, i.e. a
 *      viewport-capped panel with a scrolling body and a pinned action row, so
 *      Confirm / Cancel can never fall off the bottom of the screen.
 *   3. Long press leaking the URL   → callout, text selection, drag previews and
 *      the WebView context menu must be suppressed app-wide, with narrow
 *      exceptions (form fields, .selectable legal copy, .allow-longpress QR).
 *
 * NOTE: like the other verify scripts this is a source-contract + unit test, not
 * a device test. A real pass still happens inside Telegram (see docs/UI-REDESIGN.md).
 *
 * Usage: node --experimental-strip-types scripts/verify-ui-fixes.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");
/** Source with comments removed — so a note in a docblock can never trip a check. */
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const board = read("app/leaderboard/page.tsx");
const preview = read("components/cards/LeaderboardPreview.tsx");
const boardApi = read("app/api/leaderboard/route.ts");
const homeApi = read("app/api/home/route.ts");
const sheet = read("components/ui/Sheet.tsx");
const lobby = read("components/gaming/LudoLobby.tsx");
const hubProfile = read("app/games/profile/page.tsx");
const hardening = read("components/layout/TelegramHardening.tsx");
const layout = read("app/layout.tsx");
const css = read("app/workspace.css");
const globals = read("app/globals.css");

// ── 1. Leaderboard: name only, theme tokens only ─────────────────────────────
console.log("leaderboard: names, not handles");
check("board page never renders an @username", !/username/.test(board), "remove every `entry.username` usage");
check("board page renders display_name through displayName()", /displayName\(entry\)/.test(board));
check("board page has no raw `@` handle markup", !/>@{/.test(board) && !/"@"/.test(board));
check("preview card never renders an @username", !/entry\.username/.test(preview));
check("preview card uses the shared name helper", /displayName\(entry\)/.test(preview));
check("name helper falls back to a label, never to a handle", !/username/.test(read("lib/utils.ts").split("export function displayName")[1].split("export function")[0]));

console.log("leaderboard: theme tokens instead of a private palette");
const boardCode = code("app/leaderboard/page.tsx");
const previewCode = code("components/cards/LeaderboardPreview.tsx");
for (const stray of ["#F59E0B", "#D97706", "#94A3B8", "#63D9B4", "#10B981", "#475569", "#5B21B6", "#23856C", "text-white", "bg-slate-"]) {
  check(`board page does not hard-code ${stray}`, !boardCode.includes(stray));
  check(`preview card does not hard-code ${stray}`, !previewCode.includes(stray));
}
check("board surfaces come from --card-bg", /var\(--card-bg\)/.test(board));
check("board accent comes from --accent", /var\(--accent\)/.test(board));
check("podium keeps the workspace radius", /rounded-2xl/.test(board));
check("rows stagger in on scroll", /whileInView/.test(board));
check("period switch uses a shared layoutId pill", /layoutId="leaderboard-period-pill"/.test(board));
check("motion respects reduced motion", /useReducedMotion/.test(board));
check("your-rank card stays pinned", /sticky bottom-3/.test(board));

console.log("leaderboard: API contract");
check("/api/leaderboard normalises rows", /normalizeLeaderboardRows\(data/.test(boardApi));
check("/api/leaderboard returns display rows, not raw RPC data", /data:\s*entries/.test(boardApi) && !/data:\s*data\s*\?\?/.test(boardApi));
check("/api/home normalises its top-3 shelf", /leaderboard_top3:\s*normalizeLeaderboardRows/.test(homeApi));
check("normaliser lives in lib/leaderboard.ts", /export function normalizeLeaderboardRows/.test(read("lib/leaderboard.ts")));

// ── 2. Sheets: no dialog can fall off-screen ────────────────────────────────
console.log("stake dialog: viewport-safe sheet");
check("lobby uses the shared Sheet", /import Sheet from "@\/components\/ui\/Sheet"/.test(lobby));
check("lobby drops the old hand-rolled bottom sheet", !/fixed inset-0 z-\[100\] flex items-end/.test(lobby));
check("lobby confirm is a Sheet", /<Sheet[\s\S]*open=\{showConfirm/.test(lobby));
check("matchmaking radar is a Sheet too", /<Sheet[\s\S]*open=\{isQueueing/.test(lobby));
check("hub profile rules sheet uses Sheet", /<Sheet[\s\S]*open=\{rulesOpen\}/.test(hubProfile));
check("sheet body scrolls", /overflow-y-auto/.test(sheet) && /overscroll-contain/.test(sheet));
check("sheet body can shrink below its content", /min-h-0 flex-1/.test(sheet));
check("sheet footer is pinned outside the scroll area", /flex-none border-t/.test(sheet));
check("panel height is capped in CSS", /\.ludzo-sheet-panel\s*\{[^}]*max-height:\s*86vh/.test(globals));
check("capped height upgrades to svh where supported", /max-height:\s*86svh/.test(globals));
check("safe area handled on the footer, not the backdrop", /env\(safe-area-inset-bottom\)/.test(sheet));
check("sheet is a modal dialog for a11y", /role="dialog"/.test(sheet) && /aria-modal="true"/.test(sheet));
check("sheet escapes hub styling via a portal", /createPortal\(\s*\n?\s*<AnimatePresence>/.test(sheet) && /setContainer\(document\.body\)/.test(sheet));
check("sheet locks the page behind it", /document\.body\.style\.overflow\s*=\s*"hidden"/.test(sheet));
check("Escape dismisses the sheet", /event\.key === "Escape"/.test(sheet));

// ── 3. Telegram long press must do nothing ─────────────────────────────────
console.log("telegram: long-press callout suppressed");
check("callout off for every element", /\*,\s*\*::before,\s*\*::after\s*\{[^}]*-webkit-touch-callout:\s*none/.test(css));
check("drag previews off (no link card)", /-webkit-user-drag:\s*none/.test(css));
check("text selection off on the body", /body\s*\{[^}]*user-select:\s*none/.test(css));
check("form fields opt back in", /input, textarea, select[^}]*-webkit-user-select:\s*text/.test(css));
check("legal copy stays selectable", /\.selectable/.test(css) && /className="selectable/.test(read("components/legal/LegalPageLayout.tsx")));
check("deposit QR keeps its save gesture", /\.allow-longpress/.test(css) && /allow-longpress/.test(read("app/deposit/page.tsx")));
check("hardening is mounted at the root", /<TelegramHardening\s*\/>/.test(layout));
check("contextmenu blocked", /addEventListener\(\s*"contextmenu"/.test(hardening));
check("dragstart blocked", /addEventListener\(\s*"dragstart"/.test(hardening));
check("selectstart blocked", /addEventListener\(\s*"selectstart"/.test(hardening));
check("long-press swallows the follow-up link click", /a\[href\]/.test(hardening) && /LONG_PRESS_MS/.test(hardening));
check("inputs are exempt from suppression", /isEditable/.test(hardening));
check("desktop right-click survives (touch-gated)", /TOUCH_WINDOW_MS/.test(hardening));
check("admin console stays selectable for staff", /selectable min-h-screen/.test(read("components/admin/AdminShell.tsx")));
check("listeners are removed on unmount", /removeEventListener\(\s*"contextmenu"/.test(hardening));

// ── unit checks against the real helpers ────────────────────────────────────
console.log("unit: name resolution");
const { displayName } = await import(pathToFileURL(path.join(root, "lib/utils.ts")).href);

check("first + last name are combined", displayName({ first_name: "Aarav", last_name: "Sharma" }) === "Aarav Sharma");
check("display_name from the API wins", displayName({ display_name: "Meera K", first_name: "X" }) === "Meera K");
check("whitespace is collapsed", displayName({ first_name: "  Aarav ", last_name: "  Sharma " }) === "Aarav Sharma");
check("a handle is never used as a name", !displayName({ first_name: "", username: "secret" }).includes("secret"));
check("missing name falls back to the label", displayName({ username: "secret" }) === "Ludzo Player");
check("empty object is safe", displayName(null) === "Ludzo Player");
check("long names are truncated, not wrapped", displayName({ first_name: "X".repeat(40) }).length <= 26);

console.log("unit: row normaliser shape");
const normaliser = read("lib/leaderboard.ts");
check("normaliser maps rows explicitly", /\.map\(\(\{ row, index \}\) => \(\{/.test(normaliser));
check("normaliser never spreads a raw row (no @username passthrough)", !/\.\.\.row/.test(normaliser));
check("normaliser emits rank / id / name / photo / amount only",
  (code("lib/leaderboard.ts").match(/^\s*(rank|user_id|display_name|photo_url|usdt_earned):/gm) || []).length === 5);
check("normaliser coerces numeric strings", /function num\(/.test(normaliser) && /Number\.isFinite\(parsed\)/.test(normaliser));
check("normaliser survives a missing rank", /num\(row\.rank\) \|\| index \+ 1/.test(normaliser));

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll leaderboard / sheet / long-press checks passed.");
