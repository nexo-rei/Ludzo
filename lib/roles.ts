import { NextResponse } from "next/server";

/**
 * Staff role model.
 *
 *   admin      → full panel (owner / real admin)
 *   moderator  → limited panel: support tickets, withdrawal requests (read-only),
 *                users list (Today / All / Active / Suspended, read-only).
 *                Deposits, tasks, announcements, settings, logs, wallet
 *                adjustments, suspend — kuch bhi sensitive NAHI.
 *
 * Moderator pe zyada trust nahi hai, isliye default-deny: jo allow-list me
 * nahi hai wo 403. Role claim JWT me aati hai aur har sensitive endpoint
 * server-side check hota hai (sirf UI chhupana kaafi nahi).
 */

export const ROLE_ADMIN = "admin";
export const ROLE_MODERATOR = "moderator";

export function isModerator(role?: string | null): boolean {
  return String(role ?? "").toLowerCase() === ROLE_MODERATOR;
}

/** Full admin = anything that is NOT a moderator (backwards compatible). */
export function isSuperAdmin(role?: string | null): boolean {
  return !isModerator(role);
}

/** 403 response for moderators hitting admin-only endpoints. */
export function moderatorForbidden() {
  return NextResponse.json(
    { success: false, error: "Moderator access only — this action requires full admin." },
    { status: 403 }
  );
}
