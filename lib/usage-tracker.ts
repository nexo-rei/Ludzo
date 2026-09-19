import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cloudflare request-quota tracker (System / Bot Health).
 * ─────────────────────────────────────────────────────────────────────────────
 * Cloudflare FREE plan me 100,000 requests/day ka quota hai — cross hote hi
 * Error 1027 ke saath pura app us din ke liye band ho jata hai. Ye module
 * API requests ko count karke `usage_daily` / `usage_minute` tables me
 * likhta hai jisse /admin/system page quota burn dikha sake.
 *
 * PERFORMANCE (sabse important — per-request DB write bilkul nahi hota):
 *   - Counts pehle sirf ISOLATE MEMORY me jama hote hain (Cloudflare Workers
 *     me ek isolate kai requests handle karta hai).
 *   - Flush tabhi hota hai jab ya to 15 requests buffer ho jayein YA oldest
 *     pending batch 20s se purani ho jaye — matlab har isolate ~20s me sirf
 *     EK Supabase RPC call karta hai (bump_usage_daily, atomic UPSERT).
 *   - Flush fail ho (isolate eviction, network) to counts memory me hi
 *     rehte hain — agli flush pe retry. Sirf successful flush buffer
 *     clear karta hai, isliye double-count bhi nahi hota.
 *   - Accuracy "reasonable" hai (user ne khud sampling/batching ok kaha):
 *     isolate eviction pe at most ~20s ke counts ja sakte hain, aur sirf
 *     instrumented API routes count hote hain (static assets to Cloudflare
 *     quota me aate hi nahi hain).
 *
 * Breakdown:
 *   api          → baqi user-facing API calls
 *   game_poll    → /api/ludo/room/state (1.2s polling — sabse bada consumer)
 *   match_action → roll / move / queue join-jaisi game mutations
 */

export type UsageKind = "api" | "game_poll" | "match_action";

interface MinuteBucket {
  /** UTC date as YYYY-MM-DD (usage_daily PK). */
  date: string;
  /** ISO minute timestamp (usage_minute PK, date_trunc('minute')). */
  minute: string;
  api: number;
  polls: number;
  actions: number;
}

/** Kitne events buffer hone pe force-flush (chhota rakha — quota burn jaldi dikhe). */
const FLUSH_MIN_EVENTS = 15;
/** Kitni der purana batch hone pe force-flush. */
const FLUSH_MAX_AGE_MS = 20_000;
/** Isolate crash/error pe memory ko unbounded mat bharo — max batches. */
const MAX_BUFFERED_BUCKETS = 10;

/** Module state — Cloudflare Workers me ek isolate ke andar yeh persist hoti hai. */
const state: {
  buckets: Map<string, MinuteBucket>;
  oldestPendingAt: number;
  flushInFlight: boolean;
} = {
  buckets: new Map(),
  oldestPendingAt: 0,
  flushInFlight: false,
};

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMinuteKey(d: Date): string {
  // Supabase timestamptz ISO accept karta hai; seconds+ms hata dete hain
  // taaki key exact minute bucket ho.
  return d.toISOString().slice(0, 17) + "00.000Z";
}

function totalEvents(b: MinuteBucket): number {
  return b.api + b.polls + b.actions;
}

/** Ek request count karo. Non-blocking, kabhi throw nahi karta. */
export function trackApiRequest(kind: UsageKind): void {
  try {
    const now = new Date();
    const key = utcMinuteKey(now);
    let bucket = state.buckets.get(key);
    if (!bucket) {
      bucket = { date: utcDateKey(now), minute: key, api: 0, polls: 0, actions: 0 };
      state.buckets.set(key, bucket);
      if (!state.oldestPendingAt) state.oldestPendingAt = Date.now();
    }
    if (kind === "game_poll") bucket.polls += 1;
    else if (kind === "match_action") bucket.actions += 1;
    else bucket.api += 1;

    // Memory guard — bahut purane buckets ko current minute me merge kar do
    // (counts preserve rehte hain, granularity chhoti ho jati hai).
    if (state.buckets.size > MAX_BUFFERED_BUCKETS) {
      const keys = Array.from(state.buckets.keys()).sort();
      for (const oldKey of keys.slice(0, keys.length - MAX_BUFFERED_BUCKETS)) {
        const old = state.buckets.get(oldKey);
        state.buckets.delete(oldKey);
        if (!old) continue;
        const cur = state.buckets.get(key);
        if (cur) {
          cur.api += old.api;
          cur.polls += old.polls;
          cur.actions += old.actions;
        }
      }
    }

    maybeFlush();
  } catch {
    /* tracking kabhi bhi request fail nahi karwa sakta */
  }
}

function maybeFlush(): void {
  if (state.flushInFlight || state.buckets.size === 0) return;

  let pending = 0;
  for (const b of state.buckets.values()) pending += totalEvents(b);

  const stale = state.oldestPendingAt > 0 && Date.now() - state.oldestPendingAt >= FLUSH_MAX_AGE_MS;
  if (pending >= FLUSH_MIN_EVENTS || stale) {
    void flushBuckets();
  }
}

/** Buffered counts ko bump_usage_daily RPC se DB me bhejo (best-effort). */
async function flushBuckets(): Promise<void> {
  if (state.flushInFlight || state.buckets.size === 0) return;
  state.flushInFlight = true;

  const snapshot = Array.from(state.buckets.values());
  try {
    const supabase = createAdminClient();
    for (const bucket of snapshot) {
      const { error } = await supabase.rpc("bump_usage_daily", {
        p_date: bucket.date,
        p_minute: bucket.minute,
        p_api: bucket.api,
        p_polls: bucket.polls,
        p_actions: bucket.actions,
      });
      if (error) throw error;
      // Sirf successful flush buffer se hata — fail hone pe agli baar retry.
      state.buckets.delete(bucket.minute);
    }
    state.oldestPendingAt = state.buckets.size > 0 ? Date.now() : 0;
  } catch (err) {
    // Shor machana nahi — hot path hai. Agle request pe retry ho jayega.
    console.warn("[usage-tracker] flush deferred:", (err as Error)?.message ?? err);
  } finally {
    state.flushInFlight = false;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * User presence — users.last_seen (active users count isi se banta hai).
 * Self-throttling: per-isolate 60s me ek user ko sirf ek baar touch karte
 * hain, AUR DB update khud guard hai (sirf 45s se purani last_seen overwrite
 * hoti hai) — do isolates me bhi write-storm nahi ban sakta.
 * ──────────────────────────────────────────────────────────────────────────── */

const PRESENCE_THROTTLE_MS = 60_000;
const PRESENCE_DB_GUARD_MS = 45_000;
const lastPresenceTouch = new Map<string, number>();
let presenceBrokenSince = 0;

/** Migration 11 ke bina purane DB pe ye update error dega — retry cool-down. */
const PRESENCE_RETRY_AFTER_MS = 10 * 60_000;

export function touchUserPresence(userId: string | null | undefined): void {
  if (!userId) return;
  try {
    const now = Date.now();
    // Migration missing ho to har request pe error spam na ho — 10 min baad
    // ek retry (taaki migration run karne ke baad khud resume ho jaye).
    if (presenceBrokenSince && now - presenceBrokenSince < PRESENCE_RETRY_AFTER_MS) return;

    const last = lastPresenceTouch.get(userId) ?? 0;
    if (now - last < PRESENCE_THROTTLE_MS) return;
    lastPresenceTouch.set(userId, now);

    const guardIso = new Date(now - PRESENCE_DB_GUARD_MS).toISOString();
    // Supabase query builder thenable hai (Promise nahi), isliye async IIFE
    // me await karte hain — .catch() builder pe available nahi hota.
    void (async () => {
      try {
        // Guard: sirf stale rows overwrite karo (45s), warna skip — taaki
        // khud presence write hi quota/DB load na bane.
        const { error } = await createAdminClient()
          .from("users")
          .update({ last_seen: new Date(now).toISOString() })
          .eq("id", userId)
          .or(`last_seen.is.null,last_seen.lt.${guardIso}`);
        if (error) {
          presenceBrokenSince = Date.now();
          console.warn("[usage-tracker] presence update failed:", error.message);
        } else {
          presenceBrokenSince = 0;
        }
      } catch {
        presenceBrokenSince = Date.now();
      }
    })();
  } catch {
    /* presence kabhi bhi request fail nahi karwa sakta */
  }
}
