/**
 * The single support destination for the LUDZO Mini App.
 * ─────────────────────────────────────────────────────────────────────────────
 * Every direct-support action in the web app — "Open Telegram" on the Support
 * page, "Chat on Telegram" on Support & Disputes, and the Support entry in the
 * Gaming Profile — must open the chat with @LudzosupportBot through this exact
 * Telegram deep link:
 *
 *   https://t.me/LudzosupportBot
 *
 * t.me/<username> is Telegram's public deep link: it opens the public chat of
 * @LudzosupportBot directly (inside the Mini App via
 * Telegram.WebApp.openTelegramLink, or in a plain browser tab via window.open).
 *
 * This constant is the single source of truth — do not hard-code any other
 * support username or t.me support link anywhere else in the app.
 */
export const SUPPORT_BOT_USERNAME = "LudzosupportBot";
export const SUPPORT_TELEGRAM_URL = `https://t.me/${SUPPORT_BOT_USERNAME}`;
