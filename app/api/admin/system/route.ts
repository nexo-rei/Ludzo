import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";
import { isSuperAdmin, moderatorForbidden } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { getCapacitySnapshot, type CapacitySnapshot } from "@/lib/capacity";
import { logAdminAction } from "@/lib/admin-log";
import { subDays } from "date-fns";

export const dynamic = "force-dynamic";

/**
 * System / Bot Health — SIRF full admin (moderator ko 403).
 *
 *   GET   → live load + Cloudflare quota + DB health + Telegram webhook +
 *           capacity snapshot (har section independent — ek section fail ho
 *           to baaki data phir bhi aaye, error list me dikh jaye)
 *   PATCH → capacity settings update (limits + enforcement toggle), admin_logs
 *           me "capacity_update" action log hota hai
 */

/** Cloudflare Workers FREE plan daily request quota (Error 1027 limit). */
const CF_FREE_DAILY_LIMIT = 100_000;
/** Supabase FREE plan database size limit. */
const SUPABASE_FREE_MB = 500;
/** Telegram API calls ka timeout — bot page ko hang mat karo. */
const TELEGRAM_TIMEOUT_MS = 8_000;

/* ──────────────────────────────────────────────────────────────────────────
 * GET — poora system snapshot
 * ────────────────────────────────────────────────────────────────────────── */

interface SectionErrors {
  section: string;
  error: string;
}

async function fetchTelegramHealth(): Promise<Record<string, unknown>> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return {
      online: false,
      token_configured: false,
      error: "TELEGRAM_BOT_TOKEN env var set nahi hai",
    };
  }

  const [webhookRes, meRes] = await Promise.allSettled([
    fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      cache: "no-store",
    }),
    fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      cache: "no-store",
    }),
  ]);

  const result: Record<string, unknown> = {
    token_configured: true,
    online: false,
  };

  if (meRes.status === "fulfilled" && meRes.value.ok) {
    const me = await meRes.value.json();
    if (me?.ok) {
      result.online = true;
      result.bot_username = me.result?.username ?? null;
      result.bot_first_name = me.result?.first_name ?? null;
    } else {
      result.error = "getMe failed — token invalid ya Telegram API down";
    }
  } else {
    result.error =
      meRes.status === "rejected"
        ? `getMe timeout/error: ${(meRes.reason as Error)?.message ?? "unknown"}`
        : `getMe HTTP ${meRes.value.status}`;
  }

  if (webhookRes.status === "fulfilled" && webhookRes.value.ok) {
    const hook = await webhookRes.value.json();
    if (hook?.ok) {
      const info = hook.result ?? {};
      result.webhook_url = info.url ?? "";
      result.webhook_set = Boolean(info.url);
      result.pending_update_count = Number(info.pending_update_count ?? 0);
      result.max_connections = info.max_connections ?? null;
      result.ip_address = info.ip_address ?? null;
      result.last_error_message = info.last_error_message ?? null;
      result.last_error_date = info.last_error_date
        ? new Date(Number(info.last_error_date) * 1000).toISOString()
        : null;
      // Webhook set nahi hai to bot updates process hi nahi kar raha —
      // token valid hone ke bawajood ye RED hai.
      if (!info.url) result.online = false;
      if (!result.error && info.url) result.webhook_ok = true;
    }
  } else if (webhookRes.status === "rejected") {
    result.webhook_error = `getWebhookInfo timeout/error: ${
      (webhookRes.reason as Error)?.message ?? "unknown"
    }`;
  } else {
    result.webhook_error = `getWebhookInfo HTTP ${webhookRes.value.status}`;
  }

  return result;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }
  // Ye page system internals dikhata hai — moderator ke liye bilkul nahi.
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  const supabase = createAdminClient();
  const errors: SectionErrors[] = [];
  const now = new Date();
  const todayStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const todayDateStr = todayStartIso.slice(0, 10);

  /* ── 1. LIVE LOAD ─────────────────────────────────────────────────────── */
  const live: Record<string, unknown> = {};
  try {
    const [activeUsersRes, roomsRes, countdownRoomsRes, queueRes, dailyActRes, hourlyRes] =
      await Promise.all([
        supabase.rpc("get_active_users_count", { p_minutes: 5 }),
        supabase.from("ludo_rooms").select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("ludo_rooms").select("id", { count: "exact", head: true })
          .eq("status", "countdown"),
        supabase.from("ludo_queues").select("id", { count: "exact", head: true })
          .eq("status", "waiting"),
        supabase.rpc("get_daily_activity", { p_days: 7 }),
        supabase.rpc("get_hourly_activity", { p_days: 7 }),
      ]);

    if (activeUsersRes.error) throw new Error(`active users: ${activeUsersRes.error.message}`);
    live.active_users = Number(activeUsersRes.data ?? 0);
    live.active_users_window_min = 5;
    live.active_matches = roomsRes.count ?? 0;
    live.countdown_matches = countdownRoomsRes.count ?? 0;
    live.queue_waiting = queueRes.count ?? 0;

    if (dailyActRes.error) throw new Error(`daily activity: ${dailyActRes.error.message}`);
    const days = (dailyActRes.data ?? []) as Array<Record<string, unknown>>;
    const todayRow = days.find((d) => String(d.day).slice(0, 10) === todayDateStr);
    live.signups_today = Number(todayRow?.signups ?? 0);
    live.matches_today = Number(todayRow?.matches ?? 0);
    live.ad_plays_today = Number(todayRow?.ad_plays ?? 0);
    live.daily_trend = days.map((d) => ({
      day: String(d.day).slice(0, 10),
      signups: Number(d.signups ?? 0),
      matches: Number(d.matches ?? 0),
      ad_plays: Number(d.ad_plays ?? 0),
      requests: Number(d.requests ?? 0),
    }));

    if (hourlyRes.error) throw new Error(`hourly activity: ${hourlyRes.error.message}`);
    live.peak_hours = (hourlyRes.data ?? []).map((h: Record<string, unknown>) => ({
      hour: Number(h.hour_of_day ?? 0),
      requests: Number(h.requests ?? 0),
      ad_plays: Number(h.ad_plays ?? 0),
      matches: Number(h.matches ?? 0),
      signups: Number(h.signups ?? 0),
    }));
  } catch (err) {
    errors.push({ section: "live", error: (err as Error).message });
  }

  /* ── 2. CLOUDFLARE REQUEST QUOTA ──────────────────────────────────────── */
  const quota: Record<string, unknown> = { daily_limit: CF_FREE_DAILY_LIMIT };
  try {
    const weekAgoDate = subDays(now, 6).toISOString().slice(0, 10);
    const [dailyRes, minutesRes, firstDayRes] = await Promise.all([
      supabase.from("usage_daily").select("date, api_requests, game_polls, match_actions")
        .gte("date", weekAgoDate).order("date"),
      supabase.from("usage_minute").select("minute, api_requests, game_polls, match_actions")
        .gte("minute", new Date(now.getTime() - 15 * 60_000).toISOString()),
      supabase.from("usage_daily").select("date").order("date").limit(1),
    ]);
    if (dailyRes.error) throw new Error(dailyRes.error.message);

    const days = (dailyRes.data ?? []) as Array<{
      date: string; api_requests: number; game_polls: number; match_actions: number;
    }>;
    const today = days.find((d) => String(d.date).slice(0, 10) === todayDateStr);
    const usedToday =
      Number(today?.api_requests ?? 0) + Number(today?.game_polls ?? 0) + Number(today?.match_actions ?? 0);
    quota.used_today = usedToday;
    quota.api_today = Number(today?.api_requests ?? 0);
    quota.game_polls_today = Number(today?.game_polls ?? 0);
    quota.match_actions_today = Number(today?.match_actions ?? 0);
    quota.remaining = Math.max(0, CF_FREE_DAILY_LIMIT - usedToday);
    quota.percent_used = Math.round((usedToday / CF_FREE_DAILY_LIMIT) * 1000) / 10;
    quota.history = days.map((d) => ({
      date: String(d.date).slice(0, 10),
      api_requests: Number(d.api_requests ?? 0),
      game_polls: Number(d.game_polls ?? 0),
      match_actions: Number(d.match_actions ?? 0),
      total: Number(d.api_requests ?? 0) + Number(d.game_polls ?? 0) + Number(d.match_actions ?? 0),
    }));
    // Counter migration deploy hone ke din se hi count hota hai (partial day).
    quota.counting_since = firstDayRes.data?.[0]?.date
      ? String(firstDayRes.data[0].date).slice(0, 10)
      : null;

    // Requests-per-minute — last 5 min aur last 15 min ka average
    const minutes = (minutesRes.data ?? []) as Array<{
      minute: string; api_requests: number; game_polls: number; match_actions: number;
    }>;
    const sumWindow = (sinceMs: number) => {
      const rows = minutes.filter((m) => new Date(m.minute).getTime() >= sinceMs);
      const total = rows.reduce(
        (s, m) => s + Number(m.api_requests ?? 0) + Number(m.game_polls ?? 0) + Number(m.match_actions ?? 0),
        0
      );
      const spanMin = Math.max(1, rows.length);
      return Math.round((total / spanMin) * 10) / 10;
    };
    const rpm5 = sumWindow(now.getTime() - 5 * 60_000);
    const rpm15 = sumWindow(now.getTime() - 15 * 60_000);
    quota.requests_per_minute = rpm5;
    quota.requests_per_minute_15m = rpm15;

    // ETA — agar current rate raha to quota kab khatam hoga?
    const rate = rpm15 > 0 ? rpm15 : rpm5;
    quota.current_rate_rpm = rate;
    if (rate > 0 && usedToday < CF_FREE_DAILY_LIMIT) {
      const remaining = CF_FREE_DAILY_LIMIT - usedToday;
      const minutesLeft = remaining / rate;
      const eta = new Date(now.getTime() + minutesLeft * 60_000);
      quota.eta_iso = eta.toISOString();
      quota.eta_minutes = Math.round(minutesLeft);
      // Din khatam hone tak ka projection — agar projected < limit to safe.
      const utcMidnight = Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0
      );
      const minutesToMidnight = Math.max(0, (utcMidnight - now.getTime()) / 60_000);
      const projectedToday = Math.round(usedToday + rate * minutesToMidnight);
      quota.projected_today = projectedToday;
      quota.will_hit_limit_today = projectedToday >= CF_FREE_DAILY_LIMIT;
    } else {
      quota.eta_iso = null;
      quota.eta_minutes = null;
      quota.projected_today = usedToday;
      quota.will_hit_limit_today = false;
    }
  } catch (err) {
    errors.push({ section: "quota", error: (err as Error).message });
  }

  /* ── 3. DATABASE HEALTH (Supabase) ────────────────────────────────────── */
  const db: Record<string, unknown> = { free_limit_mb: SUPABASE_FREE_MB };
  try {
    const [sizeRes, tablesRes, connsRes] = await Promise.all([
      supabase.rpc("get_db_size"),
      supabase.rpc("get_table_sizes"),
      supabase.rpc("get_connection_stats"),
    ]);
    if (sizeRes.error) throw new Error(sizeRes.error.message);
    const sizeBytes = Number(sizeRes.data ?? 0);
    const sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 10) / 10;
    db.size_bytes = sizeBytes;
    db.size_mb = sizeMb;
    db.percent_used = Math.round((sizeMb / SUPABASE_FREE_MB) * 1000) / 10;

    db.top_tables = ((tablesRes.data ?? []) as Array<Record<string, unknown>>).map((t) => ({
      table_name: String(t.table_name),
      total_mb: Math.round((Number(t.total_bytes ?? 0) / (1024 * 1024)) * 100) / 100,
      index_mb: Math.round((Number(t.index_bytes ?? 0) / (1024 * 1024)) * 100) / 100,
      row_estimate: Number(t.row_estimate ?? 0),
    }));

    const conns = (connsRes.data ?? {}) as Record<string, unknown>;
    db.connections = {
      total: Number(conns.total_connections ?? 0),
      active: Number(conns.active_connections ?? 0),
      idle: Number(conns.idle_connections ?? 0),
      max: Number(conns.max_connections_setting ?? 0),
    };
  } catch (err) {
    errors.push({ section: "db", error: (err as Error).message });
  }

  /* ── 4. TELEGRAM BOT HEALTH ───────────────────────────────────────────── */
  let telegram: Record<string, unknown> = { online: false, error: "fetch failed" };
  try {
    telegram = await fetchTelegramHealth();
  } catch (err) {
    errors.push({ section: "telegram", error: (err as Error).message });
  }

  return buildResponse({ live, quota, db, telegram, errors, now, supabase });
}

/** GET ka common tail — capacity snapshot settings ke saath jodkar response. */
async function buildResponse(args: {
  live: Record<string, unknown>;
  quota: Record<string, unknown>;
  db: Record<string, unknown>;
  telegram: Record<string, unknown>;
  errors: SectionErrors[];
  now: Date;
  supabase: ReturnType<typeof createAdminClient>;
}) {
  let capacity: CapacitySnapshot | Record<string, unknown> = {};
  try {
    const settings = await getSettings(args.supabase);
    capacity = {
      ...(await getCapacitySnapshot(args.supabase, settings)),
      server_full_message: settings.server_full_message ?? "",
    };
  } catch (err) {
    args.errors.push({ section: "capacity", error: (err as Error).message });
  }

  return NextResponse.json({
    success: true,
    data: {
      live: args.live,
      quota: args.quota,
      db: args.db,
      telegram: args.telegram,
      capacity,
      errors: args.errors,
      generated_at: args.now.toISOString(),
    },
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * PATCH — capacity settings (sirf full admin)
 * ────────────────────────────────────────────────────────────────────────── */

const CAPACITY_MESSAGES = {
  invalid_body: "Invalid request body",
  invalid_number: (key: string) => `${key} 0 se 100000 ke beech integer hona chahiye`,
  invalid_enforcement: "capacity_enforcement sirf 'block' ya 'warn' ho sakta hai",
  invalid_message: "server_full_message 1 se 300 characters ka hona chahiye",
};

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }
  if (!isSuperAdmin(auth.role)) return moderatorForbidden();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: CAPACITY_MESSAGES.invalid_body }, { status: 400 });
    }
    const patch = body as Record<string, unknown>;

    const upserts: Array<{ key: string; value: string }> = [];
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const supabase = createAdminClient();
    const current = await getSettings(supabase);

    const numKey = (
      key: "max_concurrent_users" | "max_concurrent_matches" | "max_queue_capacity"
    ) => {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
      const raw = patch[key];
      const val = typeof raw === "string" ? Number(raw) : raw;
      if (typeof val !== "number" || !Number.isFinite(val) || val < 0 || val > 100_000 || !Number.isInteger(val)) {
        throw new Error(CAPACITY_MESSAGES.invalid_number(key));
      }
      if (val !== current[key]) changes[key] = { from: current[key], to: val };
      upserts.push({ key, value: String(val) });
    };
    numKey("max_concurrent_users");
    numKey("max_concurrent_matches");
    numKey("max_queue_capacity");

    if (Object.prototype.hasOwnProperty.call(patch, "capacity_enforcement")) {
      const val = String(patch.capacity_enforcement ?? "");
      if (val !== "block" && val !== "warn") {
        throw new Error(CAPACITY_MESSAGES.invalid_enforcement);
      }
      if (val !== current.capacity_enforcement) {
        changes.capacity_enforcement = { from: current.capacity_enforcement, to: val };
      }
      upserts.push({ key: "capacity_enforcement", value: val });
    }

    if (Object.prototype.hasOwnProperty.call(patch, "server_full_message")) {
      const val = String(patch.server_full_message ?? "").trim().slice(0, 300);
      if (val.length < 1) throw new Error(CAPACITY_MESSAGES.invalid_message);
      if (val !== current.server_full_message) {
        changes.server_full_message = { from: current.server_full_message, to: val };
      }
      upserts.push({ key: "server_full_message", value: val });
    }

    if (upserts.length === 0) {
      return NextResponse.json({ success: false, error: "Kuch bhi change nahi mila" }, { status: 400 });
    }

    const { error: upsertErr } = await supabase
      .from("settings")
      .upsert(upserts, { onConflict: "key" });
    if (upsertErr) {
      console.error("[admin/system] capacity upsert failed:", upsertErr.message);
      return NextResponse.json(
        { success: false, error: `Save failed: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    // Admin action log — kaun sa limit kab badla.
    await logAdminAction(supabase, {
      adminId: auth.adminId,
      adminUsername: auth.username,
      action: "capacity_update",
      targetType: "settings",
      targetId: "capacity",
      details: { changes },
    });

    const settings = await getSettings(supabase);
    const snapshot = await getCapacitySnapshot(supabase, settings);

    return NextResponse.json({ success: true, data: { saved: upserts, capacity: snapshot } });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}
