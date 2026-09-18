#!/usr/bin/env node
/**
 * verify-bot-start.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Regression test for the Telegram /start reply contract:
 *
 *   1. /start sends exactly ONE Telegram message (no loader, no follow-up,
 *      no image/video, no edit/delete round-trip).
 *   2. The message text is character-for-character the requested welcome.
 *   3. The first name is inserted safely (HTML-escaped, no layout breakage).
 *   4. A missing / empty / unusable first name falls back to "there".
 *   5. Exactly ONE inline button exists.
 *   6. That button is "🚀 Start Playing".
 *   7. No contact / support / FAQ / social / referral / deposit content and no
 *      extra buttons are present in the /start reply.
 *   8. A deep-link (referral) payload is still processed internally and never
 *      rendered — and auth / user-creation code stays untouched.
 *   9. /start is the ONLY supported command: /help, /profile, /paidpromotion
 *      and any unknown slash command are rejected with one static reply and
 *      never execute an old handler; plain (non-command) text is ignored.
 *
 * The route is exercised for real: `fetch` is stubbed and the webhook POST
 * handler is imported directly, so the assertions run against the same code
 * Telegram hits in production.
 *
 * Usage: node --experimental-strip-types scripts/verify-bot-start.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { register } from "node:module";

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

// ── the contract, spelled out exactly as requested ──────────────────────────
const EXPECTED_FOR = (name) =>
  [
    `Hey ${name}! 🎲`,
    "",
    "Welcome to LUDZO.",
    "",
    "Play Ludo, collect Coins, and climb the leaderboard.",
    "Your arena is ready.",
    "",
    "Tap below to start 👇",
  ].join("\n");

const BUTTON_TEXT = "🚀 Start Playing";
const ROUTE = "app/api/bot/webhook/route.ts";
const HELPER = "lib/telegram-bot.ts";

// ── @/… alias resolution, so the real route module can be imported here ─────
const rootUrl = pathToFileURL(path.join(root, "node_modules")).href.replace(/node_modules$/, "");
register(
  `data:text/javascript,${encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = ${JSON.stringify(rootUrl)};

function existing(candidates) {
  for (const candidate of candidates) {
    if (existsSync(fileURLToPath(candidate))) return candidate;
  }
  return candidates[0];
}

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), ROOT).href;
    return next(existing([base, base + ".ts", base + ".tsx", base + "/index.ts"]), context);
  }
  // next@15 ships no "exports" map, so bare subpaths need the explicit file.
  if (/^next\\/[A-Za-z0-9._-]+$/.test(specifier) && !specifier.endsWith(".js")) {
    return next(specifier + ".js", context);
  }
  return next(specifier, context);
}`)}`
);

const {
  START_BUTTON_TEXT,
  START_FALLBACK_NAME,
  buildStartMessage,
  buildStartWelcome,
  buildStartKeyboard,
  resolveMiniAppUrl,
  sanitizeFirstName,
  welcomeName,
  extractStartPayload,
  normalizeReferralCode,
} = await import(pathToFileURL(path.join(root, HELPER)).href);

// ── 1. the helper module: message shape ─────────────────────────────────────
console.log("message: exact welcome text");
check("greeting uses the Telegram first name", buildStartWelcome("Prakash") === EXPECTED_FOR("Prakash"));
check("text is exactly 8 lines with the requested spacing", buildStartWelcome("Prakash").split("\n").length === 8);
check("every paragraph break is exactly one blank line", (buildStartWelcome("Prakash").match(/\n\n/g) ?? []).length === 3);
check("no trailing whitespace / newline", buildStartWelcome("Prakash") === buildStartWelcome("Prakash").trim());
check("ASCII art, tables and long URLs are absent", !/[|+]{2,}|https?:\/\/|────/.test(buildStartWelcome("Prakash")));
check(
  "no bidi controls / tg:// links / custom-emoji markup in the text",
  !/\u202A|\u202E|\u2066|\u2067|\u2068|\u2069|tg:\/\/|tg-emoji|<emoji|premium/i.test(buildStartWelcome("Prakash"))
);
check(
  "every non-ASCII glyph is a regular Unicode emoji",
  Array.from(buildStartWelcome("Prakash"))
    .filter((ch) => (ch.codePointAt(0) ?? 0) > 0x7f)
    .every((ch) => ["🎲", "👇"].includes(ch))
);

console.log("message: missing first name falls back to \"there\"");
for (const value of [undefined, null, "", "   ", "\n\t ", "\u200B", "\u0000"]) {
  check(`first_name=${JSON.stringify(value)} → fallback greeting`, buildStartWelcome(value) === EXPECTED_FOR(START_FALLBACK_NAME));
}
check("fallback name is \"there\"", START_FALLBACK_NAME === "there");
check("undefined name → \"Hey there! 🎲\"", buildStartWelcome(undefined).startsWith("Hey there! 🎲"));
check("empty name → \"Hey there! 🎲\"", buildStartWelcome("").startsWith("Hey there! 🎲"));
check("whitespace-only name → \"Hey there! 🎲\"", buildStartWelcome("   ").startsWith("Hey there! 🎲"));
check("name object missing first_name → \"Hey there! 🎲\"", buildStartMessage({}).text.startsWith("Hey there! 🎲"));

console.log("message: unsafe first names");
const evil = '<b>Aarav</b> & <a href="https://evil.example">x</a>';
const evilText = buildStartWelcome(evil);
check("HTML in a name is escaped", !/[<>]/.test(evilText.replace("👇", "")), evilText);
check("ampersands are escaped", !/&(?!amp;|lt;|gt;)/.test(evilText));
check("escaped name renders back to the plain name", evilText.includes("Hey &lt;b&gt;Aarav&lt;/b&gt; &amp;"));
check("newlines in a name cannot break the layout", !buildStartWelcome("Aarav\n\nSupport: @evil").slice(4).split("! 🎲")[0].includes("\n"));
check("zero-width / bidi overrides are stripped", !/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/.test(welcomeName("A\u202Erav")));
check("emoji names keep whole code points", Array.from(sanitizeFirstName("😀".repeat(60))).length === 32 && !sanitizeFirstName("😀".repeat(60)).includes("\uFFFD"));
check("very long names are clamped, not wrapped", Array.from(sanitizeFirstName("X".repeat(200))).length === 32);
check("tabs and repeated spaces collapse", buildStartWelcome("  Aarav\tKumar  ").startsWith("Hey Aarav Kumar! 🎲"));

// ── 2. the helper module: exactly one button ────────────────────────────────
console.log("button: exactly one, correct text, existing mini app URL");
check("button label is \"🚀 Start Playing\"", START_BUTTON_TEXT === BUTTON_TEXT);
const keyboard = buildStartKeyboard(resolveMiniAppUrl({ TELEGRAM_BOT_USERNAME: "LudzoBot" }));
check("keyboard has exactly one row", keyboard.inline_keyboard.length === 1);
check("that row has exactly one button", keyboard.inline_keyboard[0].length === 1);
check("button text matches", keyboard.inline_keyboard[0][0].text === BUTTON_TEXT);
check("button opens the existing production mini app", keyboard.inline_keyboard[0][0].url === "https://t.me/LudzoBot/Play");
check("button is a URL button (no callback_data / web_app payload)", !("callback_data" in keyboard.inline_keyboard[0][0]) && !("web_app" in keyboard.inline_keyboard[0][0]));
check("mini app URL follows TELEGRAM_BOT_USERNAME", resolveMiniAppUrl({ TELEGRAM_BOT_USERNAME: "TestArenaBot" }) === "https://t.me/TestArenaBot/Play");
check("@prefix / junk in the username is normalised", resolveMiniAppUrl({ TELEGRAM_BOT_USERNAME: "@LudzoBot " }) === "https://t.me/LudzoBot/Play");
check("unset username keeps the production default", resolveMiniAppUrl({}) === "https://t.me/LudzoBot/Play");
check("no localhost / http URL can ever be used", !/localhost|127\.0\.0\.1|http:\/\//.test(resolveMiniAppUrl({ TELEGRAM_BOT_USERNAME: "x" })));

console.log("payload: referral deep links stay internal");
check("plain /start has no payload", extractStartPayload("/start") === null);
check("/start with trailing space has no payload", extractStartPayload("/start   ") === null);
check("/start@Bot has no payload", extractStartPayload("/start@LudzoBot") === null);
check("numeric referral (telegram_id) is extracted", extractStartPayload("/start 987654321")?.referralCode === "987654321");
check("/start@LudzoBot <payload> is extracted", extractStartPayload("/start@LudzoBot 987654321")?.referralCode === "987654321");
check("extra spaces are tolerated", extractStartPayload("/start    987654321")?.referralCode === "987654321");
check("non /start text yields nothing", extractStartPayload("/help") === null && extractStartPayload("hello") === null);
check("unsafe payload tokens are rejected", normalizeReferralCode("<script>") === null && normalizeReferralCode("a".repeat(200)) === null);
check("payload never reaches the welcome text", !buildStartWelcome("Prakash").includes("987654321"));

// ── 3. the route module, exercised with a stubbed Telegram API ──────────────
console.log("route: webhook behaviour against a stubbed Bot API");
process.env.TELEGRAM_BOT_TOKEN = "123456:TEST-TOKEN";
process.env.TELEGRAM_BOT_USERNAME = "LudzoBot";

const calls = [];
let responder = async () =>
  new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

globalThis.fetch = async (url, init = {}) => {
  calls.push({
    url: String(url),
    method: init.method ?? "GET",
    body: typeof init.body === "string" ? JSON.parse(init.body) : null,
  });
  return responder(String(url), init);
};

const { POST } = await import(pathToFileURL(path.join(root, ROUTE)).href);

async function run(update, nextResponder) {
  calls.length = 0;
  responder = nextResponder ?? (async () =>
    new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  const started = Date.now();
  const res = await POST({ json: async () => update });
  const elapsed = Date.now() - started;
  return { status: res.status, json: await res.json(), calls: [...calls], elapsed };
}

const startUpdate = (first_name, text = "/start") => ({
  update_id: 1,
  message: { message_id: 10, chat: { id: 555, type: "private" }, from: { id: 555, first_name, username: "handle" }, text },
});

const clean = await run(startUpdate("Prakash"));
check("webhook returns HTTP 200", clean.status === 200);
check("webhook returns ok:true", clean.json?.ok === true);
check("/start produces exactly ONE Telegram API call", clean.calls.length === 1, `saw ${clean.calls.length}`);
check("that call is sendMessage (POST)", clean.calls[0]?.url === "https://api.telegram.org/bot123456:TEST-TOKEN/sendMessage" && clean.calls[0]?.method === "POST");
check("no editMessageText / deleteMessage / media round-trip", !clean.calls.some((c) => /editMessageText|deleteMessage|sendPhoto|sendAnimation|sendVideo|sendSticker|sendDocument/.test(c.url)));
check("message goes to the requesting chat", clean.calls[0]?.body?.chat_id === 555);
check("body carries only text + parse_mode + reply_markup", JSON.stringify(Object.keys(clean.calls[0]?.body ?? {}).sort()) === JSON.stringify(["chat_id", "parse_mode", "reply_markup", "text"]));
check("text is EXACTLY the requested welcome", clean.calls[0]?.body?.text === EXPECTED_FOR("Prakash"), JSON.stringify(clean.calls[0]?.body?.text));
check("parse mode stays HTML", clean.calls[0]?.body?.parse_mode === "HTML");
check("exactly one inline button in the sent reply", clean.calls[0]?.body?.reply_markup?.inline_keyboard?.length === 1 && clean.calls[0].body.reply_markup.inline_keyboard[0].length === 1);
check("sent button text is \"🚀 Start Playing\"", clean.calls[0]?.body?.reply_markup?.inline_keyboard?.[0]?.[0]?.text === BUTTON_TEXT);
check("sent button URL is the configured mini app", clean.calls[0]?.body?.reply_markup?.inline_keyboard?.[0]?.[0]?.url === "https://t.me/LudzoBot/Play");
check("no loader delay inside the webhook", clean.elapsed < 500, `${clean.elapsed}ms`);
check("no second message follows", clean.calls.filter((c) => c.url.endsWith("/sendMessage")).length === 1);

const serialized = JSON.stringify(clean.calls[0]?.body ?? {});
for (const banned of [
  "Support", "support", "Contact", "contact", "FAQ", "faq", "Help Center",
  "@LudzosupportBot", "t.me/LudzosupportBot", "/help", "/profile", "/paidpromotion",
  "Referral", "referral", "Deposit", "deposit", "Withdraw", "withdraw",
  "Instagram", "Twitter", "Terms", "Privacy", "Ludzo Support",
]) {
  check(`no "${banned}" content in the /start reply`, !serialized.includes(banned));
}
check("no second URL anywhere in the reply", (serialized.match(/https?:\/\//g) ?? []).length === 1);
check("no custom emoji / premium markup in the reply", !/tg-emoji|<emoji/.test(serialized));

// ── 4. the route module: names, payloads, failures ──────────────────────────
const fallback = await run(startUpdate(undefined));
check("missing first name → \"Hey there! 🎲\"", fallback.calls[0]?.body?.text?.startsWith("Hey there! 🎲"));
check("missing first name still sends exactly one message", fallback.calls.length === 1);

const malicious = await run(startUpdate('<b>Prakash</b> & "Co"'));
check("special characters cannot break the message", malicious.calls[0]?.body?.text === EXPECTED_FOR('&lt;b&gt;Prakash&lt;/b&gt; &amp; "Co"'));
check("no raw HTML tags are ever sent", !/[<>]/.test(malicious.calls[0]?.body?.text?.replace("👇", "")));

const referral = await run(startUpdate("Prakash", "/start 987654321"));
check("referral deep link still sends exactly one message", referral.calls.length === 1);
check("referral payload is NOT shown to the user", !referral.calls[0]?.body?.text?.includes("987654321"));
check("referral deep link keeps the clean welcome text", referral.calls[0]?.body?.text === EXPECTED_FOR("Prakash"));
check("referral processing stays internal", extractStartPayload("/start 987654321")?.referralCode === "987654321");

const prefixed = await run({ ...startUpdate("Prakash", "/start@LudzoBot 987654321") });
check("/start@Bot with payload still works", prefixed.calls.length === 1 && prefixed.calls[0]?.body?.text === EXPECTED_FOR("Prakash"));

const apiError = await run(startUpdate("Prakash"), async () =>
  new Response(JSON.stringify({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
);
check("Telegram API error does not fail the webhook (no retry storm)", apiError.status === 200 && apiError.json?.ok === true);
check("Telegram API error never sends a duplicate message", apiError.calls.length === 1);

const networkError = await run(startUpdate("Prakash"), async () => {
  throw new Error("socket hang up");
});
check("network failure does not fail the webhook", networkError.status === 200 && networkError.json?.ok === true);
check("network failure never sends a duplicate message", networkError.calls.length === 1);

const callback = await run({
  update_id: 2,
  callback_query: { id: "cb-1", data: "noop", message: { chat: { id: 555 } }, from: { id: 555 } },
});
check("callback queries are still acknowledged silently", callback.calls.length === 1 && callback.calls[0].url.endsWith("/answerCallbackQuery"));

// ── 4b. command restriction: /start is the ONLY supported command ──────────
console.log("commands: /start is the only supported command");
for (const text of [
  "/help",
  "/profile",
  "/paidpromotion",
  "/help@LudzoBot",
  "/PROFILE",
  "/paidpromotion more args",
  "/totallyunknown",
]) {
  const r = await run(startUpdate("Prakash", text));
  const reply = String(r.calls[0]?.body?.text ?? "");
  check(`"${text}" → webhook still 200 + ok:true`, r.status === 200 && r.json?.ok === true);
  check(`"${text}" → exactly ONE rejection message (no old handler)`, r.calls.length === 1 && r.calls[0]?.url.endsWith("/sendMessage"), `saw ${r.calls.length} call(s)`);
  check(`"${text}" → rejection is plain text only (no keyboard / markup / URL)`, JSON.stringify(Object.keys(r.calls[0]?.body ?? {}).sort()) === JSON.stringify(["chat_id", "text"]) && !/https?:\/\//.test(reply), reply);
  check(`"${text}" → no old handler content runs`, !/Help Center|PROFILE|Paid Promotion|LudzosupportBot|t\.me\//i.test(reply), reply);
  check(`"${text}" → mentions only /start`, reply.includes("/start") && !/\/(help|profile|paidpromotion)/i.test(reply));
}

const ignored = await run({ update_id: 3, message: { message_id: 11, chat: { id: 555 }, text: "" } });
check("non-command updates are ignored", ignored.calls.length === 0 && ignored.json?.ok === true);

const plainText = await run(startUpdate("Prakash", "hello, any news?"));
check("plain text is ignored (no reply, no feature)", plainText.calls.length === 0 && plainText.json?.ok === true);

// ── 5. source contract: the old /start payload is really gone ───────────────
console.log("source: the old /start response cannot come back");
const routeCode = code(ROUTE);
// handleStart is now the ONLY handler function in the route — slice it out of
// the source so the per-function checks below keep working.
const startFn = routeCode.slice(routeCode.indexOf("async function handleStart"), routeCode.indexOf("export async function POST"));
check("the loader animation is gone", !/sleep\(|loader|█/.test(routeCode));
check("handleStart sends exactly one message", (startFn.match(/sendMessage\(/g) ?? []).length === 1, startFn);
check("handleStart builds the reply from the shared contract", /buildStartMessage\(/.test(startFn));
check("handleStart has no inline keyboard of its own", !/inline_keyboard/.test(startFn));
check("handleStart renders no support / contact / promotion copy", !/LudzosupportBot|Support|Contact|FAQ|Help Center|Promotion|Open Ludzo/.test(startFn));
check("handleStart cannot 5xx (errors are contained)", /catch/.test(startFn));
check("the route never edits or deletes messages", !/editMessageText|deleteMessage/.test(routeCode));
check("the old support / promotion buttons are gone from the route", !/LudzosupportBot/.test(startFn) && !/Open Ludzo/.test(routeCode));
check("existing webhook auth + token guard untouched", /if \(!BOT_TOKEN\)/.test(routeCode) && /answerCallbackQuery/.test(routeCode));
check("route still ignores non-text updates", /if \(!body\?\.message\?\.text\)/.test(routeCode));

console.log("source: removed command handlers cannot come back");
check("/help handler is removed from the route", !/handleHelp|Ludzo Help Center/.test(routeCode));
check("/profile handler is removed from the route", !/handleProfile|User ID/.test(routeCode));
check("/paidpromotion handler is removed from the route", !/handlePaidPromotion|Paid Promotion/.test(routeCode));
check("no switch/case branch for a removed command remains", !/case\s*["']\/(help|profile|paidpromotion)\b/.test(routeCode));
check("the route carries no support-bot reference at all", !/LudzosupportBot|ludzo_support/.test(routeCode));
check("unknown slash commands still get one static rejection reply", /UNKNOWN_COMMAND_REPLY/.test(routeCode) && /startsWith\("\/"\)/.test(routeCode));

const helperCode = code(HELPER);
check("the shared contract builds exactly one one-button keyboard", (helperCode.match(/inline_keyboard: \[\[/g) ?? []).length === 1);
check("the contract has no contact / support / referral copy", !/LudzosupportBot|Help Center|Contact:/.test(helperCode));
check("auth / user creation are not touched by this change", !/createAdminClient|credit_coins|upsert/.test(routeCode + helperCode));

// ── 6. the dead duplicate /start template in the auth route is gone ─────────
const authRoute = code("app/api/auth/telegram/route.ts");
check("no second /start welcome template ships in the repo", !/Welcome to Ludzo!/.test(authRoute) && !/BOT_COMMANDS/.test(authRoute));
check("auth POST handler is still present and unchanged", /export async function POST/.test(authRoute) && /validateTelegramInitData/.test(authRoute));
check("referral handling in auth is preserved", /referralCode/.test(authRoute) && /referrals/.test(authRoute));

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll /start welcome checks passed.");
