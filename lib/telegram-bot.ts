/**
 * Telegram bot — /start response contract (single source of truth).
 * ─────────────────────────────────────────────────────────────────────────────
 * The bot answers /start with exactly ONE message that has exactly ONE inline
 * button:
 *
 *   Hey {first_name}! 🎲
 *
 *   Welcome to LUDZO.
 *
 *   Play Ludo, collect Coins, and climb the leaderboard.
 *   Your arena is ready.
 *
 *   Tap below to start 👇
 *
 *   [ 🚀 Start Playing ]
 *
 * Everything the old reply used to carry is gone from /start: the animated
 * loader, the second "welcome" message, the contact block, the support /
 * promotion buttons, quick-command lists, referral text and long instructions.
 * Support still exists in the rest of the app (support tickets, /help,
 * /paidpromotion, the Support page) — it is only removed from the welcome reply.
 *
 * Kept deliberately dependency-free and pure so the webhook can reuse it and
 * `scripts/verify-bot-start.mjs` can unit-test it directly.
 */

/** The only button in the /start reply. */
export const START_BUTTON_TEXT = "🚀 Start Playing";

/** Used when Telegram gives us no usable first name. */
export const START_FALLBACK_NAME = "there";

/** BotFather "Mini App short name" of the existing production mini app. */
export const MINI_APP_SHORT_NAME = "Play";

/** Existing production bot — used when TELEGRAM_BOT_USERNAME is not set. */
export const DEFAULT_BOT_USERNAME = "LudzoBot";

/** Longer names are clamped so the message stays on one short line on mobile. */
const FIRST_NAME_MAX_CODEPOINTS = 32;

/** Telegram deep-link payloads are short; anything longer is not a referral. */
const PAYLOAD_MAX_LENGTH = 64;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/** Escape the three HTML entities Telegram cares about (parse_mode: HTML). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>]/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

/**
 * Make a Telegram first name safe to drop into an HTML-parsed message:
 * - control chars (incl. newlines) → space, so the layout can never break
 * - zero-width / bidi overrides stripped, so a name cannot spoof the layout
 * - whitespace collapsed, trimmed, clamped to whole code points (never splits
 *   a surrogate pair, so emoji names survive)
 *
 * Returns "" when nothing usable is left — callers then use the fallback.
 */
export function sanitizeFirstName(raw?: string | null): string {
  const text = String(raw ?? "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return Array.from(text).slice(0, FIRST_NAME_MAX_CODEPOINTS).join("").trim();
}

/**
 * The name that goes into the greeting — HTML-escaped and never empty.
 * Missing / empty / whitespace-only / control-character-only names → "there".
 */
export function welcomeName(firstName?: string | null): string {
  const clean = sanitizeFirstName(firstName);
  return clean ? escapeHtml(clean) : START_FALLBACK_NAME;
}

/**
 * The exact /start welcome text. Line spacing is part of the contract —
 * do not add paragraphs, emojis, links or contact details here.
 */
export function buildStartWelcome(firstName?: string | null): string {
  return (
    `Hey ${welcomeName(firstName)}! 🎲\n\n` +
    `Welcome to LUDZO.\n\n` +
    `Play Ludo, collect Coins, and climb the leaderboard.\n` +
    `Your arena is ready.\n\n` +
    `Tap below to start 👇`
  );
}

export interface InlineKeyboardButton {
  text: string;
  url: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

function isUsableHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
  } catch {
    return false;
  }
}

/**
 * The Mini App URL the button opens — always the project's existing production
 * link, built from the existing TELEGRAM_BOT_USERNAME env var (the same one the
 * referral links use). No new URL is invented and no localhost fallback exists.
 */
export function resolveMiniAppUrl(
  env: Record<string, string | undefined> = process.env
): string {
  const username = String(env.TELEGRAM_BOT_USERNAME ?? "")
    .trim()
    .replace(/^@/, "")
    .replace(/[^A-Za-z0-9_]/g, "");

  const url = `https://t.me/${username || DEFAULT_BOT_USERNAME}/${MINI_APP_SHORT_NAME}`;
  return isUsableHttpsUrl(url) ? url : `https://t.me/${DEFAULT_BOT_USERNAME}/${MINI_APP_SHORT_NAME}`;
}

/** Exactly one row, exactly one button. Nothing else may be added here. */
export function buildStartKeyboard(
  miniAppUrl: string = resolveMiniAppUrl()
): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: START_BUTTON_TEXT, url: miniAppUrl }]],
  };
}

export interface StartMessagePayload {
  text: string;
  parse_mode: "HTML";
  reply_markup: InlineKeyboardMarkup;
}

/**
 * The complete reply body for /start: one text, one keyboard, nothing more.
 * Callers add `chat_id` and POST it once — no follow-up message is ever sent.
 */
export function buildStartMessage(
  user?: { first_name?: string | null } | null,
  miniAppUrl?: string
): StartMessagePayload {
  return {
    text: buildStartWelcome(user?.first_name),
    parse_mode: "HTML",
    reply_markup: buildStartKeyboard(miniAppUrl),
  };
}

export interface StartPayload {
  /** Deep-link payload exactly as Telegram delivered it. Never rendered. */
  raw: string;
  /** Referral / deep-link token, or null when the payload is not one. */
  referralCode: string | null;
}

/**
 * LUDZO referral codes are the referrer's telegram_id (see
 * `app/refer/page.tsx` → `?startapp=<telegram_id>`), so plain digits are the
 * common case. Other deep-link tokens are passed through unchanged for the
 * existing auth pipeline to resolve.
 */
export function normalizeReferralCode(payload: string): string | null {
  const cleaned = payload.trim().replace(/\s+/g, "");
  if (!cleaned || cleaned.length > PAYLOAD_MAX_LENGTH) return null;
  if (/^\d{5,15}$/.test(cleaned)) return cleaned;
  if (/^[A-Za-z0-9_-]{3,64}$/.test(cleaned)) return cleaned;
  return null;
}

/**
 * `/start <payload>` (t.me/<bot>?start=<payload>) → the internal payload.
 * Returns null for a plain `/start` or for anything that is not a /start
 * command. The payload is only ever used internally: it must never be shown in
 * the welcome message, which is why it is returned separately from the text.
 */
export function extractStartPayload(text?: string | null): StartPayload | null {
  const match = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(.+))?$/i.exec(
    String(text ?? "").trim()
  );
  if (!match) return null;

  const raw = (match[1] ?? "").trim();
  if (!raw) return null;

  return { raw, referralCode: normalizeReferralCode(raw) };
}
