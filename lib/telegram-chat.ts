/**
 * Telegram chat helpers — channel / group join verification.
 * ─────────────────────────────────────────────────────────────────────────────
 * Task reward sirf tab milega jab:
 *   1. bot us channel/group me **admin** ho (warna getChatMember kaam nahi karta)
 *   2. user sach me us chat ka member ho (left/kicked nahi)
 *
 * Support kiye jaane wale chat references:
 *   • `@username`            (public channel/group)
 *   • `-1001234567890`       (numeric / supergroup id)
 *   • `https://t.me/xyz`     → @xyz
 *   • `t.me/xyz`             → @xyz
 *   • `https://t.me/+AbCdEf` → invite link; iska chat id sirf bot ke paas
 *                              admin hone par `target_id` se milta hai, isliye
 *                              aise tasks ke liye admin ko chat id daalni hoti hai.
 */

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramChatMember {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  is_member?: boolean;
  user?: { id: number; username?: string; first_name?: string };
}

export type MembershipReason =
  | "ok"
  | "not_joined"
  | "bot_not_admin"
  | "chat_not_found"
  | "user_not_found"
  | "no_token"
  | "api_error";

export interface MembershipResult {
  joined: boolean;
  reason: MembershipReason;
  /** Chat ke saath bot ki halat — UI me admin ko dikhane ke liye */
  botStatus?: string;
  userStatus?: string;
  /** Raw Telegram error (debugging ke liye) */
  detail?: string;
}

const BOT_TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? "";

/** Telegram Bot API call (never throws — error object return karta hai). */
export async function tgApi<T>(
  method: string,
  params: Record<string, string | number | undefined> = {}
): Promise<TelegramApiResponse<T>> {
  const token = BOT_TOKEN();
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN missing", error_code: 0 };

  const url = new URL(`https://api.telegram.org/bot${token}/${method}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const json = (await res.json()) as TelegramApiResponse<T>;
    return json;
  } catch (err) {
    return { ok: false, description: err instanceof Error ? err.message : "network error" };
  }
}

let cachedBotId: number | null = null;

/** Bot ka numeric id (getMe) — ek baar fetch hota hai, phir cache. */
export async function getBotId(): Promise<number | null> {
  if (cachedBotId) return cachedBotId;
  const res = await tgApi<{ id: number }>("getMe");
  if (res.ok && res.result?.id) {
    cachedBotId = res.result.id;
    return cachedBotId;
  }
  return null;
}

/**
 * Kisi bhi raw input (link / @username / numeric id) ko Telegram ka
 * acceptable chat_id string me badalta hai.
 */
export function normalizeChatRef(raw?: string | null): string | null {
  if (!raw) return null;
  let value = String(raw).trim();
  if (!value) return null;

  // URL ho to host + path nikalo
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      value = `${u.pathname}${u.search}`;
    } catch {
      /* ignore */
    }
  }

  value = value.replace(/^\/+/, "");

  // t.me/xyz  |  telegram.me/xyz  |  t.me/joinchat/...  |  t.me/+hash
  let fromLink = false;
  const linkMatch = value.match(/^(?:t\.me|telegram\.me|telegram\.dog)\/(.+)$/i);
  if (linkMatch) {
    value = linkMatch[1];
    fromLink = true;
  }

  value = value.replace(/^\+/, "invite:");
  if (/^invite:/i.test(value) || /^joinchat\//i.test(value)) {
    // Private invite links me readable username nahi hota —
    // is case me admin ko numeric chat id (target_id) daalni padegi.
    return null;
  }

  // @username
  if (value.startsWith("@")) {
    const uname = value.slice(1).replace(/[^A-Za-z0-9_]/g, "");
    return uname ? `@${uname}` : null;
  }

  // numeric id (supergroups usually -100… se shuru hote hain)
  if (/^-?\d{5,}$/.test(value)) return value;

  // plain username — link se aaya ho to short legacy names bhi accept karo
  if (fromLink ? /^[A-Za-z0-9_]+$/.test(value) : /^[A-Za-z0-9_]{4,}$/.test(value)) {
    return `@${value}`;
  }

  return null;
}

/** Task row se best chat reference nikalo (target_id pehle, phir link). */
export function resolveTaskChatRef(task: {
  target_id?: string | null;
  target_link?: string | null;
}): string | null {
  return normalizeChatRef(task.target_id) ?? normalizeChatRef(task.target_link);
}

const JOINED_STATUSES = new Set(["member", "administrator", "creator"]);

/** User ki membership check karo — bot admin hona chahiye. */
export async function checkChatMembership(
  chatRef: string,
  telegramUserId: string | number
): Promise<MembershipResult> {
  if (!BOT_TOKEN()) return { joined: false, reason: "no_token" };

  const chatId = normalizeChatRef(chatRef) ?? chatRef;

  // 1) Bot khud admin hai ya nahi?
  const botId = await getBotId();
  if (!botId) return { joined: false, reason: "api_error", detail: "getMe failed" };

  const botMember = await tgApi<TelegramChatMember>("getChatMember", {
    chat_id: chatId,
    user_id: botId,
  });

  const botStatus = botMember.ok ? botMember.result?.status : undefined;

  if (!botMember.ok) {
    const desc = (botMember.description ?? "").toLowerCase();
    if (desc.includes("chat not found")) return { joined: false, reason: "chat_not_found", detail: botMember.description };
    if (desc.includes("not enough rights") || desc.includes("bot is not a member")) {
      return { joined: false, reason: "bot_not_admin", detail: botMember.description };
    }
    return { joined: false, reason: "api_error", detail: botMember.description };
  }

  if (botStatus !== "administrator" && botStatus !== "creator") {
    return { joined: false, reason: "bot_not_admin", botStatus, detail: "bot is not admin in this chat" };
  }

  // 2) User member hai ya nahi?
  const userMember = await tgApi<TelegramChatMember>("getChatMember", {
    chat_id: chatId,
    user_id: telegramUserId,
  });

  if (!userMember.ok) {
    const desc = (userMember.description ?? "").toLowerCase();
    // "user not found" => user ne kabhi chat join hi nahi kiya
    if (desc.includes("user not found") || desc.includes("participant not found")) {
      return { joined: false, reason: "not_joined", botStatus, detail: userMember.description };
    }
    if (desc.includes("chat not found")) {
      return { joined: false, reason: "chat_not_found", botStatus, detail: userMember.description };
    }
    return { joined: false, reason: "api_error", botStatus, detail: userMember.description };
  }

  const status = userMember.result?.status;
  const isMember = userMember.result?.is_member === true;
  const joined = (status ? JOINED_STATUSES.has(status) : false) || (status === "restricted" && isMember);

  return {
    joined,
    reason: joined ? "ok" : "not_joined",
    botStatus,
    userStatus: status,
  };
}

/** Admin panel ke liye: kya bot is chat ko manage kar sakta hai? */
export async function getBotChatAccess(chatRef: string): Promise<{
  ok: boolean;
  botStatus?: string;
  chatTitle?: string;
  chatType?: string;
  reason?: MembershipReason;
  detail?: string;
}> {
  if (!BOT_TOKEN()) return { ok: false, reason: "no_token", detail: "TELEGRAM_BOT_TOKEN missing" };

  const chatId = normalizeChatRef(chatRef) ?? chatRef;

  const chatInfo = await tgApi<{ title?: string; type?: string }>("getChat", { chat_id: chatId });
  if (!chatInfo.ok) {
    const desc = (chatInfo.description ?? "").toLowerCase();
    if (desc.includes("chat not found")) return { ok: false, reason: "chat_not_found", detail: chatInfo.description };
    return { ok: false, reason: "api_error", detail: chatInfo.description };
  }

  const botId = await getBotId();
  if (!botId) return { ok: false, reason: "api_error", detail: "getMe failed" };

  const member = await tgApi<TelegramChatMember>("getChatMember", { chat_id: chatId, user_id: botId });
  const botStatus = member.ok ? member.result?.status : undefined;
  const ok = botStatus === "administrator" || botStatus === "creator";

  return {
    ok,
    botStatus,
    chatTitle: chatInfo.result?.title,
    chatType: chatInfo.result?.type,
    reason: ok ? "ok" : "bot_not_admin",
    detail: ok ? undefined : (member.description ?? `bot status: ${botStatus ?? "unknown"}`),
  };
}

/** Bot se kisi chat/user ko message bhejo (best-effort — throw nahi karta). */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra: Record<string, string | number> = {}
): Promise<boolean> {
  const res = await tgApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: "true",
    ...extra,
  });
  if (!res.ok) console.error("[telegram] sendMessage failed:", res.description);
  return res.ok;
}
