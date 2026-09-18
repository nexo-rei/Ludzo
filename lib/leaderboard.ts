/**
 * LUDZO — leaderboard payload normaliser
 * ─────────────────────────────────────────────────────────────────────────────
 * `get_leaderboard()` (Supabase) returns raw user columns: first_name, last_name,
 * username, a text-ish rank and a numeric/string balance. Every surface that
 * renders rankings — /leaderboard and the "Top Earners" card on Home — used to
 * reshuffle that by hand, which is how the @username ended up on ranks 4+ while
 * the podium only showed a name.
 *
 * This module is the single place that turns those rows into display data:
 *   • `display_name`  → the Telegram account name (never a @handle)
 *   • no `username`   → the field is dropped here so the client cannot render it
 *   • numbers         → real numbers (Postgres hands back strings for bigint)
 */

import { displayName } from "./utils";
import type { LeaderboardEntry } from "@/types";

/** Raw row shape coming out of the `get_leaderboard()` function. */
export interface LeaderboardRow {
  rank?: number | string | null;
  user_id?: string | null;
  id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  usdt_earned?: number | string | null;
  total_usdt_earned?: number | string | null;
}

function num(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeLeaderboardRows(rows: LeaderboardRow[] | null | undefined): LeaderboardEntry[] {
  return (rows ?? [])
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => Boolean(row && (row.user_id || row.id)))
    .map(({ row, index }) => ({
      rank: num(row.rank) || index + 1,
      user_id: String(row.user_id ?? row.id),
      display_name: displayName(row),
      photo_url: row.photo_url ?? undefined,
      usdt_earned: num(row.usdt_earned ?? row.total_usdt_earned),
    }));
}
