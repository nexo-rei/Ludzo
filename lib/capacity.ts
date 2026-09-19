import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/types";

/**
 * Capacity controls (System / Bot Health page ka enforcement half).
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin /admin/system se 3 limits + 1 toggle set karta hai (settings table):
 *
 *   max_concurrent_users   → block mode me: itne active users (last 5 min)
 *                            ke baad NAYE users ko /api/home pe 503
 *                            "server_full" milta hai → maintenance screen.
 *                            Already-active user ya match me phase player
 *                            kabhi block nahi hota.
 *   max_concurrent_matches → block mode me: itne live rooms ke baad naya
 *                            queue join reject.
 *   max_queue_capacity     → block mode me: itni waiting entries ke baad
 *                            naya queue join reject.
 *   capacity_enforcement   → 'block' = limits enforce karo,
 *                            'warn'  = sirf admin panel me red alert.
 *
 * Default 'warn' hai (sql/11 seed) — migrate karte hi koi user block nahi
 * hota. Har check fail-open hai: DB/settings error pe users ko lock-out
 * karna capacity system ka job nahi.
 */

export interface CapacitySnapshot {
  active_users: number;
  active_matches: number;
  queue_waiting: number;
  max_concurrent_users: number;
  max_concurrent_matches: number;
  max_queue_capacity: number;
  enforcement: "block" | "warn";
  users_over: boolean;
  matches_over: boolean;
  queue_over: boolean;
  /** True jab koi bhi limit cross ho rahi ho (admin red alert). */
  any_over: boolean;
}

export interface CapacityBlock {
  blocked: boolean;
  message?: string;
}

/** Active users + live rooms + waiting queue — ek snapshot. */
export async function getCapacitySnapshot(
  supabase: SupabaseClient,
  settings: AppSettings
): Promise<CapacitySnapshot> {
  const [activeUsersRes, roomsRes, queueRes] = await Promise.all([
    supabase.rpc("get_active_users_count", { p_minutes: 5 }).then(
      (r) => r,
      () => ({ data: null, error: null } as never)
    ),
    supabase
      .from("ludo_rooms")
      .select("id", { count: "exact", head: true })
      .in("status", ["countdown", "active"]),
    supabase
      .from("ludo_queues")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting"),
  ]);

  const activeUsers = Number(activeUsersRes.data ?? 0) || 0;
  const activeMatches = roomsRes.count ?? 0;
  const queueWaiting = queueRes.count ?? 0;

  const maxUsers = settings.max_concurrent_users ?? 0;
  const maxMatches = settings.max_concurrent_matches ?? 0;
  const maxQueue = settings.max_queue_capacity ?? 0;
  const enforcement: "block" | "warn" =
    settings.capacity_enforcement === "block" ? "block" : "warn";

  const usersOver = maxUsers > 0 && activeUsers >= maxUsers;
  const matchesOver = maxMatches > 0 && activeMatches >= maxMatches;
  const queueOver = maxQueue > 0 && queueWaiting >= maxQueue;

  return {
    active_users: activeUsers,
    active_matches: activeMatches,
    queue_waiting: queueWaiting,
    max_concurrent_users: maxUsers,
    max_concurrent_matches: maxMatches,
    max_queue_capacity: maxQueue,
    enforcement,
    users_over: usersOver,
    matches_over: matchesOver,
    queue_over: queueOver,
    any_over: usersOver || matchesOver || queueOver,
  };
}

/**
 * /api/home entry guard — sirf 'block' mode me active users limit check.
 * Already-active user (last_seen < 5 min) ya jiska match chal raha hai usko
 * kabhi block nahi karte (match beech me mat todo, active player already
 * counted hai).
 */
export async function checkEntryCapacity(
  supabase: SupabaseClient,
  settings: AppSettings,
  userId: string
): Promise<CapacityBlock> {
  try {
    if (settings.capacity_enforcement !== "block") return { blocked: false };
    const limit = settings.max_concurrent_users ?? 0;
    if (limit <= 0) return { blocked: false };

    // 1. Match me involved player ko hamesha andar aane do.
    const { data: activeRoom } = await supabase
      .from("ludo_rooms")
      .select("id")
      .in("status", ["countdown", "active"])
      .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
      .limit(1);
    if (activeRoom && activeRoom.length > 0) return { blocked: false };

    // 2. Pehle se active user (last 5 min me dekha gaya) — already counted.
    const { data: user } = await supabase
      .from("users")
      .select("last_seen")
      .eq("id", userId)
      .maybeSingle();
    if (user?.last_seen) {
      const ageMs = Date.now() - new Date(user.last_seen as string).getTime();
      if (ageMs < 5 * 60_000) return { blocked: false };
    }

    // 3. Nayi entry — capacity check.
    const { data: activeCount } = await supabase.rpc("get_active_users_count", {
      p_minutes: 5,
    });
    if (Number(activeCount ?? 0) >= limit) {
      return {
        blocked: true,
        message:
          settings.server_full_message ||
          "LUDZO servers are at full capacity right now. Please try again in a few minutes!",
      };
    }
  } catch {
    /* fail-open — capacity system down ho to users ko block karna galat hai */
  }
  return { blocked: false };
}

/**
 * /api/ludo/queue/join guard — sirf 'block' mode me match-limit / queue-limit
 * enforce karta hai. (User limit entry pe hi lagti hai, join pe nahi.)
 */
export async function checkJoinCapacity(
  supabase: SupabaseClient,
  settings: AppSettings
): Promise<CapacityBlock> {
  try {
    if (settings.capacity_enforcement !== "block") return { blocked: false };
    const snapshot = await getCapacitySnapshot(supabase, settings);
    if (snapshot.matches_over || snapshot.queue_over) {
      return {
        blocked: true,
        message:
          snapshot.queue_over
            ? "Matchmaking queue is full right now. Please try again in a few minutes!"
            : "Too many matches are running right now. Please try again in a few minutes!",
      };
    }
  } catch {
    /* fail-open */
  }
  return { blocked: false };
}
